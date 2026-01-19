import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.SERVER_ORIGIN ? `${process.env.SERVER_ORIGIN}/api/:path*` : "http://localhost:4001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
