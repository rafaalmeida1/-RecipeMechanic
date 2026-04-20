import path from "node:path";
import { defineConfig } from "vitest/config";

/** Sem plugin React — testes atuais são libs puras (Node). Evita bundler Rolldown do Vitest 4+. */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", "**/*.jest.test.ts", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
