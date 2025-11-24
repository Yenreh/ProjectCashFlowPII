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
  // Aumentar límite de body para recibos (después de compresión ~2-3MB)
  experimental: {
    bodySizeLimit: '10mb',
  },
}

export default nextConfig