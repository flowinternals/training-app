import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image configuration for external domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Headers for Firebase Auth popup compatibility
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
  // Turbopack configuration for TinyMCE assets
  turbopack: {
    rules: {
      '*.woff': {
        loaders: ['file-loader'],
        as: '*.woff',
      },
      '*.woff2': {
        loaders: ['file-loader'],
        as: '*.woff2',
      },
      '*.eot': {
        loaders: ['file-loader'],
        as: '*.eot',
      },
      '*.ttf': {
        loaders: ['file-loader'],
        as: '*.ttf',
      },
      '*.otf': {
        loaders: ['file-loader'],
        as: '*.otf',
      },
    },
  },
  // Copy TinyMCE assets to public directory
  async rewrites() {
    return [
      {
        source: '/tinymce/:path*',
        destination: '/node_modules/tinymce/:path*',
      },
    ];
  },
};

export default nextConfig;
