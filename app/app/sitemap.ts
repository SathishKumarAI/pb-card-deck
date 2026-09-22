import type { MetadataRoute } from "next";

const SITE_URL = "https://pb-card-deck.vercel.app";

// Backlog F483 - sitemap.xml. Single-page app today; add routes here as they ship.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
  ];
}
