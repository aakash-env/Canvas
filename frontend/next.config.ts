import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration
  turbopack: {},
  // Hide x-powered-by header for production security
  poweredByHeader: false,
  // Enable HTTP response compression
  compress: true,
  // Strict mode for detecting side effects
  reactStrictMode: true,
};

export default nextConfig;
