import type { NextConfig } from "next";

// Served from https://coletivo-inspira.github.io/orbit/ — set PAGES_BASE_PATH="" to build for a root domain.
const basePath = process.env.PAGES_BASE_PATH ?? "/orbit";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
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
