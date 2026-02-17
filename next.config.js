/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Configure allowed image domains (add your own domains here)
  images: {
    domains: [],
  },
}

module.exports = nextConfig
