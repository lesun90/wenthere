import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@beenthere/ui', '@beenthere/storage-cloud'],
}

export default nextConfig
