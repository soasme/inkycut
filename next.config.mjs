/** @type {import("next").NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["pg"],
  images: {
    remotePatterns: process.env.S3_ENDPOINT
      ? [
          {
            protocol: new URL(process.env.S3_ENDPOINT).protocol.replace(":", ""),
            hostname: new URL(process.env.S3_ENDPOINT).hostname,
            pathname: "/**",
          },
        ]
      : [],
  },
}

export default nextConfig
