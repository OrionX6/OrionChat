import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  experimental: {
    // Disable development overlay
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
