import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16.4 create-next-app defaults.
  cacheComponents: true,
  partialPrefetching: true,
  // CLAUDE.md is the single source of agent instructions for this repository,
  // so `next dev` must not generate an extra AGENTS.md file.
  agentRules: false,
  images: {
    // Design assets are small, pre-sized JPGs; serve them as-is so their
    // original quality is preserved (no re-encoding).
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
