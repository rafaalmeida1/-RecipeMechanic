import { ReceiptLineKind } from "@prisma/client";
import { formatCentsBRL } from "@/lib/money";

export function subtotalsByKind(
  lines: Array<{ kind: ReceiptLineKind; lineTotalCents: number }>,
): { productCents: number; serviceCents: number } {
  let productCents = 0;
  let serviceCents = 0;
  for (const l of lines) {
    if (l.kind === ReceiptLineKind.PRODUCT) {
      productCents += l.lineTotalCents;
    } else {
      serviceCents += l.lineTotalCents;
    }
  }
  return { productCents, serviceCents };
}

/**
 * Valor que o cliente ainda deve (ou que entra no recibo de pagamento).
 * Se `clientPaidForParts`, peças não entram — resta a soma das linhas de serviço.
 */
export function getClientAmountDueCents(
  clientPaidForParts: boolean,
  totalCents: number,
  lines: Array<{ kind: ReceiptLineKind; lineTotalCents: number }>,
): number {
  if (!clientPaidForParts) return totalCents;
  return subtotalsByKind(lines).serviceCents;
}

/** Reais por parcela em centavos inteiros, soma = totalCents. */
export function cardInstallmentAmountsCents(
  totalCents: number,
  installmentCount: number,
): number[] {
  if (installmentCount < 1) return [totalCents];
  const n = Math.min(12, Math.max(1, installmentCount));
  const base = Math.floor(totalCents / n);
  const rem = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** Ex.: "3x de R$ 15,00" se todas iguais; senão "4 parcelas" + totais. */
export function cardInstallmentSummaryPt(totalCents: number, installmentCount: number): string {
  if (installmentCount < 2) {
    return "À vista no cartão";
  }
  const amounts = cardInstallmentAmountsCents(totalCents, installmentCount);
  const unique = [...new Set(amounts)];
  if (unique.length === 1) {
    return `${installmentCount}x de ${formatCentsBRL(unique[0])} cada`;
  }
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  if (min === max) {
    return `${installmentCount}x de ${formatCentsBRL(min)} cada`;
  }
  return `${installmentCount} parcelas: de ${formatCentsBRL(min)} a ${formatCentsBRL(max)}`;
}
