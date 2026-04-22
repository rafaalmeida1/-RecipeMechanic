import { describe, expect, it } from "vitest";
import { ReceiptLineKind } from "@prisma/client";
import {
  cardInstallmentAmountsCents,
  getClientAmountDueCents,
  subtotalsByKind,
} from "./receipt-totals";

describe("subtotalsByKind", () => {
  it("soma peças e serviços em separado", () => {
    const lines = [
      { kind: ReceiptLineKind.PRODUCT, lineTotalCents: 1000 },
      { kind: ReceiptLineKind.PRODUCT, lineTotalCents: 200 },
      { kind: ReceiptLineKind.SERVICE, lineTotalCents: 500 },
    ];
    expect(subtotalsByKind(lines)).toEqual({ productCents: 1200, serviceCents: 500 });
  });
});

describe("cardInstallmentAmountsCents", () => {
  it("reparte centavos de forma exata (100 em 3)", () => {
    const a = cardInstallmentAmountsCents(100, 3);
    expect(a).toEqual([34, 33, 33]);
    expect(a.reduce((s, x) => s + x, 0)).toBe(100);
  });

  it("1 parcela = total", () => {
    expect(cardInstallmentAmountsCents(99, 1)).toEqual([99]);
  });
});

describe("getClientAmountDueCents", () => {
  it("com peças quitadas, cliente deve só a soma de serviços", () => {
    const lines = [
      { kind: ReceiptLineKind.PRODUCT, lineTotalCents: 700_00 },
      { kind: ReceiptLineKind.SERVICE, lineTotalCents: 600_00 },
    ];
    const totalCents = 700_00 + 600_00;
    expect(
      getClientAmountDueCents(true, totalCents, lines),
    ).toBe(600_00);
  });

  it("se não marcou peças quitadas, o valor devido é o total do recibo", () => {
    const lines = [
      { kind: ReceiptLineKind.PRODUCT, lineTotalCents: 100 },
      { kind: ReceiptLineKind.SERVICE, lineTotalCents: 200 },
    ];
    expect(getClientAmountDueCents(false, 300, lines)).toBe(300);
  });
});
