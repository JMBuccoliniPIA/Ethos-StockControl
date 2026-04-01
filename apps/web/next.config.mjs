/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ethos/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
};

export default nextConfig;
