import { describe, expect, it } from "vitest";
import { formatCentsBRL, parseMoneyToCents } from "./money";

describe("parseMoneyToCents", () => {
  it("interpreta vírgula decimal pt-BR", () => {
    expect(parseMoneyToCents("123,45")).toBe(12345);
    expect(parseMoneyToCents("1.234,56")).toBe(123456);
  });

  it("aceita prefixo R$", () => {
    expect(parseMoneyToCents("R$ 10,00")).toBe(1000);
  });

  it("retorna null para inválido", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("x")).toBeNull();
  });
});

describe("formatCentsBRL", () => {
  it("formata centavos em BRL", () => {
    expect(formatCentsBRL(12345)).toMatch(/123,45/);
    expect(formatCentsBRL(0)).toMatch(/0,00/);
  });
});
