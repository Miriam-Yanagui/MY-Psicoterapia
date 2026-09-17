import type { Metadata } from "next";
import {
  LANDING_DESCRIPTION,
  LANDING_PATH,
  LANDING_TITLE,
  LANDING_URL,
  professionalServiceSchema,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
  alternates: { canonical: LANDING_PATH },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: LANDING_URL,
    siteName: "MY Psicoterapia",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
  },
};

export default function HomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(professionalServiceSchema).replace(/</g, "\\u003c"),
      }}
    />
    {children}
  </>;
}
