import { describe, expect, it } from "vitest";
import {
  D1_MAX_BOUND_PARAMS,
  RECEIPT_LINE_INSERT_COLUMNS,
  chunkForD1,
  d1RowsPerStatement,
} from "./d1";

const rows = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("d1RowsPerStatement", () => {
  it("mantém-se dentro do tecto de parâmetros do D1", () => {
    for (let columns = 1; columns <= 30; columns++) {
      const perStatement = d1RowsPerStatement(columns);
      expect(perStatement * columns).toBeLessThanOrEqual(D1_MAX_BOUND_PARAMS);
    }
  });

  it("nunca devolve zero, mesmo com mais colunas do que parâmetros", () => {
    expect(d1RowsPerStatement(200)).toBe(1);
  });
});

describe("chunkForD1", () => {
  it("não perde nem reordena linhas", () => {
    const input = rows(97);
    expect(chunkForD1(input, RECEIPT_LINE_INSERT_COLUMNS).flat()).toEqual(input);
  });

  it("parte um recibo grande em blocos que o D1 aceita", () => {
    // 200 linhas é o máximo que o schema de validação permite por recibo.
    const chunks = chunkForD1(rows(200), RECEIPT_LINE_INSERT_COLUMNS);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length * RECEIPT_LINE_INSERT_COLUMNS).toBeLessThanOrEqual(
        D1_MAX_BOUND_PARAMS,
      );
    }
  });

  it("devolve lista vazia para nenhuma linha, para não emitir um INSERT vazio", () => {
    expect(chunkForD1([], RECEIPT_LINE_INSERT_COLUMNS)).toEqual([]);
  });

  it("cabe num só bloco quando as linhas são poucas", () => {
    expect(chunkForD1(rows(5), RECEIPT_LINE_INSERT_COLUMNS)).toHaveLength(1);
  });
});
