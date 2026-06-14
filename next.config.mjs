/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf2json', 'mammoth'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('pdf2json', 'mammoth');
    }
    return config;
  },
};

export default nextConfig;
