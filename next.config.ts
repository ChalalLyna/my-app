import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  webpack: (config) => {
    config.watchOptions = {
      poll: 500,           // réduit de 1000 → 500ms, bon compromis
      aggregateTimeout: 200, // regroupe les changements avant de recompiler
      ignored: [
        "**/node_modules/**",
        "**/.next/**",
        "**/.git/**",
      ], // 🔑 clé principale — stoppe le scan de ces dossiers énormes
    };
    return config;
  },
};

export default nextConfig;