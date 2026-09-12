/**
 * O Cloudflare D1 aceita no máximo 100 parâmetros ligados por query — muito
 * abaixo dos 999 do SQLite normal. Um `createMany` gera um INSERT com
 * `linhas × colunas` parâmetros, por isso tem de ser partido em blocos ou
 * rebenta com `D1_ERROR: too many SQL variables`.
 */
export const D1_MAX_BOUND_PARAMS = 100;

/**
 * Quantas linhas cabem num só INSERT, dado o número de colunas escritas por
 * linha. Nunca devolve menos de 1 — uma linha com mais de 100 colunas não é
 * representável no D1 de qualquer forma, e nesse caso é melhor falhar na query
 * do que num loop infinito aqui.
 */
export function d1RowsPerStatement(columnsPerRow: number): number {
  if (columnsPerRow <= 0) return D1_MAX_BOUND_PARAMS;
  return Math.max(1, Math.floor(D1_MAX_BOUND_PARAMS / columnsPerRow));
}

/** Parte `rows` em blocos que respeitem o tecto de parâmetros do D1. */
export function chunkForD1<T>(rows: readonly T[], columnsPerRow: number): T[][] {
  const size = d1RowsPerStatement(columnsPerRow);
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

/**
 * Colunas escritas por linha de `ReceiptLine` num `createMany`: os 8 campos
 * explícitos (incluindo `descriptionFolded`) mais o `id` (cuid), que o Prisma
 * gera no cliente e envia no INSERT.
 */
export const RECEIPT_LINE_INSERT_COLUMNS = 9;
