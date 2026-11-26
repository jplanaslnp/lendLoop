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
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "design/**", "tests/e2e/**"],
  },
});
