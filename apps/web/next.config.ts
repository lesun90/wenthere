import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ['@beenthere/domain', '@beenthere/ui', '@beenthere/storage-local', '@beenthere/storage-github'],
  // Expose packages/ui/data path so the subdivision route can find geo files regardless of cwd
  env: {
    UI_DATA_DIR: path.resolve(__dirname, '../../packages/ui/data'),
  },
  async headers() {
    return [
      {
        source: "/geo/subdivisions/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/demo/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
