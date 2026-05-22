import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@beenthere/ui', '@beenthere/storage-supabase'],
}

export default nextConfig
