import type { MetadataRoute } from "next";

const SITE_URL = "https://www.mypsicoterapia.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/onboarding/checkout",
        "/onboarding/confirmation",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
