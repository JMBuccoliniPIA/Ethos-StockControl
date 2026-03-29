/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ethos/shared'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://ethos-stockcontrol.onrender.com/api/v1',
  },
};

export default nextConfig;
