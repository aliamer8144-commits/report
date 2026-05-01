import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  transpilePackages: ['hijri-date-converter'],
};

export default nextConfig;
