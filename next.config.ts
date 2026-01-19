import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Prevent Next from picking an incorrect monorepo root when multiple lockfiles exist.
  // This fixes issues like missing build artifacts during `next build`.
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // Keep things simple: no special image setup needed for this app.
    // (Vercel supports the Image Optimization API, but we primarily use <img> anyway.)
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
