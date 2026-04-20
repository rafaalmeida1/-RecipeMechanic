/**
 * Jest — action com Prisma e auth mockados.
 */
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(() =>
    Promise.resolve({
      user: { id: "test-user-id", email: "t@test.com", name: "T" },
    }),
  ),
}));

const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/db", () => ({
  __esModule: true,
  default: {
    receipt: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

import { ReceiptPdfTheme } from "@prisma/client";
import { setReceiptPdfTheme } from "@/server/receipts/set-receipt-pdf-theme";

describe("setReceiptPdfTheme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue({ id: "r1" });
    mockUpdate.mockResolvedValue({});
  });

  it("retorna erro quando recibo não existe", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const res = await setReceiptPdfTheme("missing", ReceiptPdfTheme.LIGHT);
    expect(res).toEqual({ ok: false, error: "Recibo não encontrado" });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("atualiza pdfTheme e retorna ok", async () => {
    const res = await setReceiptPdfTheme("r1", ReceiptPdfTheme.DARK);
    expect(res).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { pdfTheme: ReceiptPdfTheme.DARK },
    });
  });
});
