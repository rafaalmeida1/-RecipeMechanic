import type { ReceiptPdfTheme } from "@prisma/client";

export function receiptPdfThemeLabel(t: ReceiptPdfTheme): string {
  return t === "LIGHT" ? "Claro (elegante)" : "Escuro (premium)";
}

export function receiptPdfThemeDescription(t: ReceiptPdfTheme): string {
  return t === "LIGHT"
    ? "Cabeçalho escuro com corpo claro — visual de recibo tradicional."
    : "Visual noturno com alto contraste, o estilo original RIBEIROCAR.";
}
