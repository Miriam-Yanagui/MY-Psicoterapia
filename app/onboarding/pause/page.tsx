"use client";

import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { routes } from "@/lib/flow";

export default function PausePage() {
  const router = useRouter();
  return <MobileScreen className="f04">
    <BrandMark />
    <div className="cream-watermark" aria-hidden="true" />
    <p className="f04-eyebrow">UN MOMENTO PARA TI</p>
    <h1 className="f04-message">Detenerte un momento<br />para reconocer cómo<br />te sientes ya es una<br />forma de empezar a<br />escucharte.</h1>
    <div className="f04-heart" aria-hidden="true">❤️</div>
    <PrimaryButton onClick={() => router.push(routes.experience)}>Continuar</PrimaryButton>
  </MobileScreen>;
}
