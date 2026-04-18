/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    const backend = process.env.BACKEND_INTERNAL_URL ?? 'http://backend:3001';
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
