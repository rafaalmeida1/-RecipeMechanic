import { describe, expect, it } from "vitest";
import { ReceiptPdfTheme } from "@prisma/client";
import {
  getReceiptPdfStyles,
  receiptPdfStylesDark,
  receiptPdfStylesLight,
} from "./receipt-pdf-styles";

describe("getReceiptPdfStyles", () => {
  it("tema escuro usa fundo preto na página", () => {
    const s = getReceiptPdfStyles(ReceiptPdfTheme.DARK);
    expect(s.page.backgroundColor).toBe("#000000");
    expect(s).toBe(receiptPdfStylesDark);
  });

  it("tema claro usa fundo papel na página", () => {
    const s = getReceiptPdfStyles(ReceiptPdfTheme.LIGHT);
    expect(s.page.backgroundColor).toBe("#F5F5F4");
    expect(s).toBe(receiptPdfStylesLight);
  });
});
