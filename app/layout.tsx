import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { OnboardingProvider } from "@/context/OnboardingProvider";
import { UiClickSound } from "@/components/ui/UiClickSound";
import { CookieNotice } from "@/components/legal/CookieNotice";
import { MetaHomePageView } from "@/components/analytics/MetaHomePageView";
import { LANDING_DESCRIPTION, LANDING_TITLE, SITE_URL } from "@/lib/seo";
import "./globals.css";
import "./checkout.css";

const manrope = localFont({ src: "../public/assets/manrope-variable.ttf", variable: "--font-manrope", weight: "200 800", display: "swap" });
const bethany = localFont({ src: "../public/assets/bethany-elingston.otf", variable: "--font-bethany", weight: "400", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
  applicationName: "MY Psicoterapia",
  icons: {
    icon: [{ url: "/assets/isotipo_miriam.svg", type: "image/svg+xml" }],
    shortcut: "/assets/isotipo_miriam.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${manrope.variable} ${bethany.variable}`}><UiClickSound /><OnboardingProvider>{children}</OnboardingProvider><CookieNotice /><MetaHomePageView /></body></html>;
}
