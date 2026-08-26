import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow youtubei.js to work in server-side route handlers (Next.js 16+)
  serverExternalPackages: ['youtubei.js'],
  // No SSR for main app — entirely client-rendered
  // Only API routes run server-side
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '**.ggpht.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
