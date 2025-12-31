// apps/next.config.js
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  experimental: {
    externalDir: true,
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  swcMinify: true,
  
  // ✅ Add webpack config to resolve @ aliases
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/shared': path.resolve(__dirname, './shared'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/components': path.resolve(__dirname, './components'),
    };
    return config;
  },
};

module.exports = nextConfig;