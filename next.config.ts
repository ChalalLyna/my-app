import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000, // Le fameux radar qui scanne toutes les secondes
      aggregateTimeout: 300,
    };
    return config;
  },
};

export default nextConfig;