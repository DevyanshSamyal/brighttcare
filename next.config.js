/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // @react-pdf/renderer is a Node-native renderer (its own reconciler, WASM
  // layout engine) — keeping it out of Next's bundling avoids it being
  // processed as if it were app/client code.
  serverExternalPackages: ["@react-pdf/renderer"],
};

module.exports = nextConfig;
