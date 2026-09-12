/**
 * O `ILIKE` do Postgres faz case-folding Unicode, por isso "válv" encontrava
 * "VÁLVULA". No SQLite do D1 não há equivalente: o `LIKE` só ignora
 * maiúsculas em ASCII e o `lower()` também só converte ASCII — "Á" fica "Á".
 *
 * A solução é guardar uma cópia normalizada dos campos pesquisáveis e procurar
 * sobre ela. O `toLowerCase()` do JavaScript faz case-folding Unicode completo,
 * o que reproduz exactamente a semântica do `ILIKE`: "válv" encontra "VÁLVULA",
 * mas "valv" (sem acento) continua a não encontrar — tal como no Postgres.
 */
export function foldForSearch(value: string): string {
  return value.toLowerCase();
}
