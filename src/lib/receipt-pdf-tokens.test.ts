import { describe, expect, it } from "vitest";
import { ReceiptPdfTheme } from "@prisma/client";
import { receiptPdfThemeDescription, receiptPdfThemeLabel } from "./receipt-pdf-tokens";

describe("receiptPdfThemeLabel", () => {
  it("rotula temas", () => {
    expect(receiptPdfThemeLabel(ReceiptPdfTheme.LIGHT)).toContain("Claro");
    expect(receiptPdfThemeLabel(ReceiptPdfTheme.DARK)).toContain("Escuro");
  });
});

describe("receiptPdfThemeDescription", () => {
  it("descreve tema claro com cabeçalho escuro", () => {
    expect(receiptPdfThemeDescription(ReceiptPdfTheme.LIGHT)).toContain("Cabeçalho");
  });
});
