"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { routes } from "@/lib/flow";

export default function SplashPage() {
  const router = useRouter();
  useEffect(() => { const timer = window.setTimeout(() => router.replace(routes.home), 1000); return () => window.clearTimeout(timer); }, [router]);
  return <>
    <meta httpEquiv="refresh" content={`2;url=${routes.home}`} />
    <MobileScreen className="splash" fullViewport><Image src="/assets/logo-blanco.png" alt="Psicóloga Miriam Yanagui" width={278} height={198} priority /></MobileScreen>
  </>;
}
