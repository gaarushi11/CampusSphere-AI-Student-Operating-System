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
};

export default nextConfig;
