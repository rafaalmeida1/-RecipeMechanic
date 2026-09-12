/**
 * Passo 3/3 da migração para o Cloudflare D1 — e o que sustenta o "sem perdas".
 *
 * Relê tudo dos dois lados e compara linha a linha, campo a campo. Não confia
 * em contagens: uma contagem igual com valores trocados passaria despercebida.
 *
 *   pnpm run d1:verify
 *   pnpm run d1:verify -- --target=CLOUDFLARE_STAGING_DATABASE_ID
 *
 * Sai com código 1 se encontrar qualquer diferença.
 */
import "dotenv/config";
import { PrismaClient as PostgresClient } from "../../src/generated/prisma-postgres";
import { createD1PrismaClient, readD1Credentials } from "../../src/lib/db";
import { foldForSearch } from "../../src/lib/search";
import { TABLES, delegateFor, type Row, type TableSpec } from "./manifest";

/** Páginas pequenas para não esbarrar no tamanho máximo de resposta do D1. */
const PAGE_SIZE = 200;

/** Não aparece em nenhum id, email ou token, logo não cria colisões de chave. */
const KEY_SEPARATOR = String.fromCharCode(0);

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function readAll(client: any, spec: TableSpec): Promise<Row[]> {
  const orderBy = spec.key.map((field) => ({ [field]: "asc" as const }));
  const rows: Row[] = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page: Row[] = await delegateFor(client, spec.model).findMany({
      orderBy,
      skip,
      take: PAGE_SIZE,
    });
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function keyOf(row: Row, spec: TableSpec): string {
  return spec.key.map((field) => String(row[field])).join(KEY_SEPARATOR);
}

/** Iguala o que é semanticamente o mesmo valor apesar de representações distintas. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a instanceof Date || b instanceof Date) {
    const ta = a instanceof Date ? a.getTime() : NaN;
    const tb = b instanceof Date ? b.getTime() : NaN;
    return ta === tb;
  }
  // O Postgres devolve `null` onde o D1 pode devolver `undefined` num opcional.
  if (a == null || b == null) return a == null && b == null;
  return Object.is(a, b);
}

type Difference = { table: string; key: string; detail: string };

function compareTable(
  spec: TableSpec,
  source: readonly Row[],
  target: readonly Row[],
): Difference[] {
  const differences: Difference[] = [];
  const targetByKey = new Map(target.map((r) => [keyOf(r, spec), r]));
  const seen = new Set<string>();

  for (const sourceRow of source) {
    const key = keyOf(sourceRow, spec);
    seen.add(key);
    const targetRow = targetByKey.get(key);

    if (!targetRow) {
      differences.push({ table: spec.table, key, detail: "em falta no D1" });
      continue;
    }

    // Cada campo do Postgres tem de chegar intacto ao D1.
    for (const field of Object.keys(sourceRow)) {
      if (!sameValue(sourceRow[field], targetRow[field])) {
        differences.push({
          table: spec.table,
          key,
          detail: `${field}: Postgres=${JSON.stringify(sourceRow[field])} D1=${JSON.stringify(targetRow[field])}`,
        });
      }
    }

    // As colunas normalizadas não existem no Postgres; confirma-se que o D1 as
    // tem calculadas a partir da coluna de origem, senão a pesquisa não
    // encontraria os dados migrados.
    for (const [column, from] of Object.entries(spec.derived ?? {})) {
      const expected = foldForSearch(String(sourceRow[from]));
      if (targetRow[column] !== expected) {
        differences.push({
          table: spec.table,
          key,
          detail: `${column}: esperava ${JSON.stringify(expected)}, D1=${JSON.stringify(targetRow[column])}`,
        });
      }
    }
  }

  for (const targetRow of target) {
    const key = keyOf(targetRow, spec);
    if (!seen.has(key)) {
      differences.push({
        table: spec.table,
        key,
        detail: "existe no D1 mas não no Postgres",
      });
    }
  }

  return differences;
}

async function main() {
  if (!process.env.POSTGRES_URL?.trim()) {
    throw new Error("Falta POSTGRES_URL — a connection string do Postgres de origem.");
  }

  const postgres = new PostgresClient();
  const d1 = createD1PrismaClient({
    ...readD1Credentials(),
    databaseId: resolveTargetDatabaseId(),
  });

  const differences: Difference[] = [];

  try {
    for (const spec of TABLES) {
      const source = await readAll(postgres, spec);
      const target = await readAll(d1, spec);
      const tableDiffs = compareTable(spec, source, target);
      differences.push(...tableDiffs);

      const status = tableDiffs.length === 0 ? "ok" : `${tableDiffs.length} diferenças`;
      console.log(
        `  ${spec.table.padEnd(20)} Postgres=${String(source.length).padStart(6)}  D1=${String(target.length).padStart(6)}  ${status}`,
      );
    }
  } finally {
    await postgres.$disconnect();
    await d1.$disconnect();
  }

  if (differences.length === 0) {
    console.log("\nSem diferenças. A migração está fiel ao Postgres.");
    return;
  }

  console.error(`\n${differences.length} diferenças encontradas:\n`);
  for (const d of differences.slice(0, 100)) {
    console.error(`  [${d.table}] ${d.key} — ${d.detail}`);
  }
  if (differences.length > 100) {
    console.error(`  ... e mais ${differences.length - 100}.`);
  }
  process.exit(1);
}

main().catch((error) => {
  console.error("\nA verificação falhou:", error);
  process.exit(1);
});
