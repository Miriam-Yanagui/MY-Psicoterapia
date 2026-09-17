import type { MetadataRoute } from "next";
import { LANDING_URL, SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: LANDING_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/aviso-de-privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
