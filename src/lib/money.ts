export function parseMoneyToCents(input: string): number | null {
  const s = input.trim().replace(/\s/g, "").replace(/^R\$\s?/i, "");
  if (!s) return null;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function formatCentsBRL(cents: number): string {
  const v = cents / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
