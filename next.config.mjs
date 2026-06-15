/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf2json', 'mammoth', 'zod'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('pdf2json', 'mammoth', 'zod');
    }
    return config;
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
