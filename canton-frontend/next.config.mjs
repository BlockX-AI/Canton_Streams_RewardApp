/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
  env: {
    CANTON_JSON_API_URL: process.env.CANTON_JSON_API_URL || 'http://localhost:7575',
    CANTON_AUTH_SECRET:  process.env.CANTON_AUTH_SECRET  || 'change-me-in-production',
    CANTON_ADMIN_PARTY:  process.env.CANTON_ADMIN_PARTY  || '',
    CANTON_ALICE_PARTY:  process.env.CANTON_ALICE_PARTY  || '',
    CANTON_BOB_PARTY:    process.env.CANTON_BOB_PARTY    || '',
  },
};

export default nextConfig;
