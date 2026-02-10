import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Transpile CopilotKit packages
  transpilePackages: ['@copilotkit/react-core', '@copilotkit/react-ui'],

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Tree-shake large packages for faster dev compilation
    optimizePackageImports: [
      '@copilotkit/react-core',
      '@copilotkit/react-ui',
      'lucide-react',
      'framer-motion',
    ],
  },

  // Increase chunk loading timeout to prevent dev timeouts on cold start
  webpack: (config, { dev }) => {
    if (dev) {
      config.output = {
        ...config.output,
        chunkLoadTimeout: 60000, // 60s instead of default 30s
      };
    }
    return config;
  },
};

export default nextConfig;
