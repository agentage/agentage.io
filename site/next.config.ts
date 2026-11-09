import type { NextConfig } from 'next';

// Static export: the root pages part serves out/ (scripts/export-site.mjs); no server, so no redirects or rewrites.
const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
