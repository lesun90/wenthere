/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ['sharp', 'exifr', 'pg'],
  },
};

export default nextConfig;
