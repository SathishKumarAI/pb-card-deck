import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit + a11y tests for lib/ logic and key components (F251, F253, F161, F258).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx"],
  },
});
