import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("mescla classes tailwind sem duplicar", () => {
    expect(cn("px-2 py-1", "px-4")).toContain("px-4");
    expect(cn("px-2 py-1", "px-4")).toContain("py-1");
  });
});
