/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'partnerscom.com.br',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
}

module.exports = nextConfig





