import type { NextConfig } from "next";
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  devIndicators: false,
  images: { unoptimized: true },
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};
export default config;
