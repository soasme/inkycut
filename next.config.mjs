/** @type {import("next").NextConfig} */
const nextConfig = {
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
