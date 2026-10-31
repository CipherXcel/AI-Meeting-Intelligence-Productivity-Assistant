import type { MetadataRoute } from "next";
import { publicGuides } from "../lib/public-guides";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only public, canonical pages belong here; workspace data requires sign-in.
  return [
    { url: "https://cipherxcel.dev/" },
    ...publicGuides.map(({ slug }) => ({
      url: `https://cipherxcel.dev/${slug}/`,
    })),
  ];
}
