/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['antd', '@ant-design/icons'],

  // API 代理配置 - 所有 /api 请求转发到后端
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4001';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
