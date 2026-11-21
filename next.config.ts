import type { NextConfig } from "next";
import { fileURLToPath } from "url";

const nextConfig: NextConfig = {
  cacheComponents: true,
  turbopack: {
    root: process.env.VERCEL ? undefined : fileURLToPath(new URL(".", import.meta.url)),
  }
};

export default nextConfig;
