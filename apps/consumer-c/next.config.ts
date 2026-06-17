import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@sso/auth"],
  allowedDevOrigins: [
    "idp.test",
    "consumer-a.test",
    "consumer-b.test",
    "consumer-c.test",
  ],
}

export default nextConfig
