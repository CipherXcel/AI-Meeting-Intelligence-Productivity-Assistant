import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only public, canonical pages belong here; workspace data requires sign-in.
  return [{ url: "https://cipherxcel.dev/" }];
}
