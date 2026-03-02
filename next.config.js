/** next.config.js */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    appDir: false, // force Next.js à utiliser /pages au lieu du nouveau /app
  },
}

module.exports = nextConfig
