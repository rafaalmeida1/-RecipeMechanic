import { describe, expect, it } from "vitest";
import { foldForSearch } from "./search";

/** Reproduz o que a base faz: procurar o termo normalizado no campo normalizado. */
const encontra = (campo: string, termo: string) =>
  foldForSearch(campo).includes(foldForSearch(termo));

describe("foldForSearch", () => {
  it("ignora maiúsculas em palavras acentuadas, como o ILIKE do Postgres", () => {
    expect(encontra("VÁLVULA TERMOSTÁTICA", "válv")).toBe(true);
    expect(encontra("FILTRO DE ÓLEO", "óleo")).toBe(true);
    expect(encontra("ÁGUA", "água")).toBe(true);
  });

  it("continua a não ignorar o acento em si, tal como o ILIKE", () => {
    expect(encontra("VÁLVULA", "valv")).toBe(false);
    expect(encontra("ÓLEO", "oleo")).toBe(false);
  });

  it("mantém o comportamento em ASCII", () => {
    expect(encontra("FILTRO DE AR", "filtro")).toBe(true);
    expect(encontra("filtro de ar", "FILTRO")).toBe(true);
  });

  it("é idempotente", () => {
    const once = foldForSearch("VÁLVULA");
    expect(foldForSearch(once)).toBe(once);
  });
});
