/**
 * Passo 2/3 da migração para o Cloudflare D1.
 *
 * Lê o dump de `.migration-data/` e insere-o no D1 **através do próprio Prisma
 * com o adapter D1**, e não por SQL escrito à mão. Isto é deliberado: garante
 * que datas, booleanos e enums são serializados exactamente da mesma forma que
 * a app vai usar depois para os ler.
 *
 *   pnpm run d1:import              # base definida em CLOUDFLARE_DATABASE_ID
 *   pnpm run d1:import -- --target=CLOUDFLARE_STAGING_DATABASE_ID
 *
 * As linhas mantêm os `id` originais: o `receipt.id` é o assunto do HMAC dos
 * links de PDF já partilhados, e o `clientDraftKey` é o que impede recibos
 * duplicados quando um aparelho offline reenvia.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createD1PrismaClient, readD1Credentials } from "../../src/lib/db";
import { chunkForD1 } from "../../src/lib/d1";
import {
  DUMP_DIR,
  TABLES,
  applyDerived,
  columnsPerRow,
  delegateFor,
  reviveDates,
  type Row,
} from "./manifest";

function resolveTargetDatabaseId(): string {
  const flag = process.argv.find((a) => a.startsWith("--target="));
  if (!flag) return readD1Credentials().databaseId;

  const varName = flag.slice("--target=".length);
  const value = process.env[varName]?.trim();
  if (!value) {
    throw new Error(`A variável de ambiente ${varName} está vazia ou não existe.`);
  }
  return value;
}

async function main() {
  const credentials = { ...readD1Credentials(), databaseId: resolveTargetDatabaseId() };
  const prisma = createD1PrismaClient(credentials);
  const dumpDir = path.resolve(process.cwd(), DUMP_DIR);

  console.log(`A importar para a base D1 ${credentials.databaseId}\n`);

  try {
    // A ordem de TABLES respeita as chaves estrangeiras, que o D1 valida.
    for (const spec of TABLES) {
      const raw = await readFile(path.join(dumpDir, `${spec.table}.json`), "utf8");
      const rows = (JSON.parse(raw) as Row[]).map((r) => applyDerived(reviveDates(r, spec), spec));

      if (rows.length === 0) {
        console.log(`  ${spec.table.padEnd(20)} vazia`);
        continue;
      }

      const existing: number = await delegateFor(prisma, spec.model).count();
      if (existing > 0) {
        throw new Error(
          `${spec.table} já tem ${existing} linhas no D1. ` +
            `Este script só corre contra uma base vazia — limpa-a antes de repetir.`,
        );
      }

      // O D1 rejeita queries com mais de 100 parâmetros ligados, por isso um
      // `createMany` de muitas linhas tem de ser partido.
      const chunks = chunkForD1(rows, columnsPerRow(rows));
      let written = 0;
      for (const chunk of chunks) {
        const result = await delegateFor(prisma, spec.model).createMany({
          data: chunk,
        });
        written += result.count ?? chunk.length;
      }

      if (written !== rows.length) {
        throw new Error(
          `${spec.table}: esperava inserir ${rows.length} linhas, inseriu ${written}.`,
        );
      }

      console.log(
        `  ${spec.table.padEnd(20)} ${written} linhas (${chunks.length} blocos)`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("\nImportação concluída. Corre `pnpm run d1:verify` a seguir.");
}

main().catch((error) => {
  console.error("\nA importação falhou:", error);
  process.exit(1);
});
