/**
 * Jest — ambiente Node (crypto HMAC).
 */
process.env.AUTH_SECRET = "test-secret-for-jest-min-32-chars-ok!!";

import { signReceiptPdfAccess, verifyReceiptPdfAccess } from "@/lib/receipt-pdf-token";

describe("receipt-pdf-token", () => {
  it("assinatura e verificação devolvem o mesmo receiptId", () => {
    const token = signReceiptPdfAccess("recibo-id-xyz");
    expect(verifyReceiptPdfAccess(token)).toEqual({ receiptId: "recibo-id-xyz" });
  });

  it("token inválido retorna null", () => {
    expect(verifyReceiptPdfAccess("não-base64!!!")).toBeNull();
    expect(verifyReceiptPdfAccess("")).toBeNull();
  });
});
