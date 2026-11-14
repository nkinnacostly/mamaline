"use client";

// Unsplash serves photos through imgix, which resizes on its own CDN. Asking it for the
// exact width avoids sending multi-megabyte originals through the Next.js optimizer.
// Local images (from /public) are returned unchanged.
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src.startsWith("https://images.unsplash.com/")) {
    const url = new URL(src);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", String(quality ?? 75));
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "max");
    return url.toString();
  }
  return src;
}
