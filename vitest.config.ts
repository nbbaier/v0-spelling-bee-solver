import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The first test seam covers the pure logic in lib/. Tests are co-located
    // next to the modules they characterize (lib/parse.test.ts, etc.).
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
