import type { Metadata } from "next";
import { SplashPageClient } from "@/components/onboarding/SplashPageClient";
import { LANDING_DESCRIPTION, LANDING_PATH, LANDING_TITLE } from "@/lib/seo";

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
  alternates: { canonical: LANDING_PATH },
  robots: { index: false, follow: true },
};

export default function SplashPage() {
  return <SplashPageClient />;
}
