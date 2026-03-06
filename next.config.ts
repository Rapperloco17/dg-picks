import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization for remote logos
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
        pathname: '/**',
      },
    ],
    unoptimized: true, // Allow external images without optimization
  },
  
  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_API_FOOTBALL_KEY: process.env.NEXT_PUBLIC_API_FOOTBALL_KEY,
    NEXT_PUBLIC_API_FOOTBALL_URL: process.env.NEXT_PUBLIC_API_FOOTBALL_URL,
  },
  
  // Output standalone for deployment
  output: 'standalone',
};

export default nextConfig;
