import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // lib/sbsolver.ts guards itself with `import "server-only"`, which throws
      // when evaluated outside a React Server Component. Stub it so the
      // scraper's pure parse helpers can be unit-tested.
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url)
      ),
    },
  },
  test: {
    // The first test seam covers the pure logic in lib/. Tests are co-located
    // next to the modules they characterize (lib/parse.test.ts, etc.).
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
