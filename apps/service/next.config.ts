import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@beenthere/ui', '@beenthere/storage-cloud'],
}

export default nextConfig
