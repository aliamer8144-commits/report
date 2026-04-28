import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // هذا يخبر Webpack أنه لا يتعامل مع fs و path و os في الـ frontend
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

export default nextConfig;