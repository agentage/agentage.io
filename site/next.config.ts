import type { NextConfig } from 'next';

// Static export: the root pages part serves out/ (scripts/export-site.mjs); no server, so no redirects or rewrites.
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // Built from site/ (scripts/export-site.mjs sets the cwd); the repo root lockfile is the extension's.
  turbopack: { root: process.cwd() },
};

export default nextConfig;
