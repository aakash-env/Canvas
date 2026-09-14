import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence the webpack-vs-turbopack warning; Konva is loaded client-side
  // via dynamic import with ssr:false so no special bundler config is needed.
  turbopack: {},
};

export default nextConfig;
