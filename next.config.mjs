/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Optimizaciones de compilación
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimizaciones de bundle - compatible con Next.js 14.2
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns', '@radix-ui/react-icons'],
  },
  // Swc minify para builds más rápidos
  swcMinify: true,
  // Webpack optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Optimizar chunks para mejor code splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Separar iconos en su propio chunk
            icons: {
              test: /[\\/]node_modules[\\/](lucide-react)[\\/]/,
              name: 'icons',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Separar gráficos en su propio chunk
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3-.*)[\\/]/,
              name: 'charts',
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      }
    }
    return config
  },
}

export default nextConfig