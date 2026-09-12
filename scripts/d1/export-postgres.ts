/**
 * Passo 1/3 da migração para o Cloudflare D1.
 *
 * Lê todas as tabelas do PostgreSQL de origem e grava-as em JSON, uma por
 * ficheiro, em `.migration-data/`. Não altera nada no Postgres.
 *
 *   POSTGRES_URL="postgresql://..." pnpm run d1:export
 */
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "../../src/generated/prisma-postgres";
import { DUMP_DIR, TABLES, delegateFor, type Row } from "./manifest";

async function main() {
  if (!process.env.POSTGRES_URL?.trim()) {
    throw new Error(
      "Falta POSTGRES_URL — a connection string do PostgreSQL de origem.",
    );
  }

  const prisma = new PrismaClient();
  const outDir = path.resolve(process.cwd(), DUMP_DIR);
  await mkdir(outDir, { recursive: true });

  const counts: Record<string, number> = {};

  try {
    for (const spec of TABLES) {
      const rows: Row[] = await delegateFor(prisma, spec.model).findMany();
      counts[spec.table] = rows.length;

      await writeFile(
        path.join(outDir, `${spec.table}.json`),
        JSON.stringify(rows, null, 2),
        "utf8",
      );

      console.log(`  ${spec.table.padEnd(20)} ${rows.length} linhas`);
    }

    await writeFile(
      path.join(outDir, "_counts.json"),
      JSON.stringify({ exportedAt: new Date().toISOString(), counts }, null, 2),
      "utf8",
    );
  } finally {
    await prisma.$disconnect();
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`\nExportadas ${total} linhas para ${DUMP_DIR}/`);
}

main().catch((error) => {
  console.error("\nA exportação falhou:", error);
  process.exit(1);
});
