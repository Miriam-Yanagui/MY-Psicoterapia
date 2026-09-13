import type { Metadata } from "next";
import localFont from "next/font/local";
import { OnboardingProvider } from "@/context/OnboardingProvider";
import "./globals.css";
import "./checkout.css";

const manrope = localFont({ src: "../public/assets/manrope-variable.ttf", variable: "--font-manrope", weight: "200 800", display: "swap" });
const bethany = localFont({ src: "../public/assets/bethany-elingston.otf", variable: "--font-bethany", weight: "400", display: "swap" });

export const metadata: Metadata = { title: "Miriam Yanagui · Psicóloga", description: "Terapia por videollamada" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className={`${manrope.variable} ${bethany.variable}`}><OnboardingProvider>{children}</OnboardingProvider></body></html>;
}
