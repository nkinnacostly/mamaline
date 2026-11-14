import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Photos are free-licence images from Unsplash (credits in the README), resized by
    // Unsplash's own CDN through this loader instead of the built-in optimizer.
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    qualities: [75],
  },
};

export default nextConfig;
