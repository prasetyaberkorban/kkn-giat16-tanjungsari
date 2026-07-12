import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.26'],
  basePath: "/gdrive",
};

export default nextConfig;
