"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { routes } from "@/lib/flow";

export default function SplashPage() {
  const router = useRouter();
  useEffect(() => { const timer = window.setTimeout(() => router.replace(routes.home), 1000); return () => window.clearTimeout(timer); }, [router]);
  return <MobileScreen className="splash"><Image src="/assets/logo-blanco.png" alt="Miriam Yanagui, Psicóloga" width={278} height={198} priority /></MobileScreen>;
}
