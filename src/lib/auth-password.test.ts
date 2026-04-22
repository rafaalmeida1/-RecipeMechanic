import { describe, expect, it } from "vitest";
import { isValidUserPassword } from "./auth-password";

describe("isValidUserPassword", () => {
  it("rejeita muito curta e aceita 8+ chars", () => {
    expect(isValidUserPassword("1234567").ok).toBe(false);
    expect(isValidUserPassword("12345678").ok).toBe(true);
  });
});
