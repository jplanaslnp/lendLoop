import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Vite 8 resolves tsconfig `paths` (the `@/*` alias) natively.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // Convex function tests (tests/convex) declare the edge-runtime
    // environment per file; convex-test must be inlined to load modules.
    server: { deps: { inline: ["convex-test"] } },
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/convex/**/*.test.ts",
      "src/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules/**", "design/**", "tests/e2e/**"],
  },
});
