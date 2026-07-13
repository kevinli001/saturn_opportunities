import path from "path";
import type { NextConfig } from "next";

// Pin the workspace root to this app so Next doesn't walk up to the parent
// repo (which has its own lockfile / Next app).
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
