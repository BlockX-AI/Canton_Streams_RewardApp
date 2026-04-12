/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    CANTON_JSON_API_URL: process.env.CANTON_JSON_API_URL || 'http://localhost:7575',
    CANTON_LEDGER_HOST: process.env.CANTON_LEDGER_HOST || 'localhost',
    CANTON_LEDGER_PORT: process.env.CANTON_LEDGER_PORT || '6866',
    CANTON_NAMESPACE:    process.env.CANTON_NAMESPACE    || '',
    CANTON_PACKAGE_ID:   process.env.CANTON_PACKAGE_ID   || '',
    CANTON_AUTH_SECRET:  process.env.CANTON_AUTH_SECRET  || 'change-me-in-production',
    CANTON_ADMIN_PARTY:  process.env.CANTON_ADMIN_PARTY  || '',
    CANTON_ALICE_PARTY:  process.env.CANTON_ALICE_PARTY  || '',
    CANTON_BOB_PARTY:    process.env.CANTON_BOB_PARTY    || '',
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
