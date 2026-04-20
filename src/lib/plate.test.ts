import { describe, expect, it } from "vitest";
import { formatPlateDisplay, normalizePlate } from "./plate";

describe("normalizePlate", () => {
  it("remove caracteres não alfanuméricos e coloca em maiúsculas", () => {
    expect(normalizePlate("abc-1d23")).toBe("ABC1D23");
    expect(normalizePlate("  ab 12 34 ")).toBe("AB1234");
  });
});

describe("formatPlateDisplay", () => {
  it("formata placa Mercosul 7 caracteres", () => {
    expect(formatPlateDisplay("ABC1D23")).toBe("ABC-1D23");
  });

  it("formata placa antiga 7 letras+números", () => {
    expect(formatPlateDisplay("ABC1234")).toBe("ABC-1234");
  });

  it("retorna como está se não casar padrão", () => {
    expect(formatPlateDisplay("AB")).toBe("AB");
  });
});
