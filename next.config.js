/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/twitter/callback',
        destination: '/api/auth/callback/twitter',
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent.cdninstagram.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'scontent-*.cdninstagram.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'instagram.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.instagram.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'imgur.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'graph.facebook.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
}
module.exports = nextConfig 