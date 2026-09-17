import type { MetadataRoute } from "next";

const SITE_URL = "https://www.mypsicoterapia.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/onboarding/home`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/aviso-de-privacidad`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
