import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker build sets NEXT_OUTPUT=standalone; `next start` does not support it.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
};

export default nextConfig;
