
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
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
  experimental: {
    // This allows the Next.js dev server to accept requests from the
    // Firebase Studio preview proxy.
    // allowedDevOrigins is no longer needed here as it's a top-level property now.
  },
  // This allows the Next.js dev server to accept requests from the
  // Firebase Studio preview proxy.
  allowedDevOrigins: [
      "https://*.cloudworkstations.dev",
  ]
};

export default nextConfig;
