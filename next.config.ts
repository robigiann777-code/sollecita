import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Non bloccare la pubblicazione su Vercel per avvisi di stile del linter.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
