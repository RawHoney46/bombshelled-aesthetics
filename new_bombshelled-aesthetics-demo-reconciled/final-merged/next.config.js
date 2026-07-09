/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force rebuild
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
