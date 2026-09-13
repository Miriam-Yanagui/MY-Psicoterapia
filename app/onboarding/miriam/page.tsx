"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useOnboarding } from "@/context/OnboardingProvider";
import { routes } from "@/lib/flow";

export default function MiriamPage() {
  const router = useRouter();
  const { state } = useOnboarding();
  const name = state.name.trim() || "Andrea";
  return <MobileScreen className="f06">
    <BrandMark inverse />
    <span className="f06-accent f06-accent--top" aria-hidden="true" /><span className="f06-accent f06-accent--bottom" aria-hidden="true" />
    <section className="f06-card" aria-labelledby="miriam-title">
      <p>HOLA, {name.toLocaleUpperCase("es-MX")}.</p>
      <h1 id="miriam-title">Soy Miriam Yanagui.</h1>
      <p className="f06-body">Psicóloga con maestría en<br />Psicoterapia Cognitivo-Conductual.</p>
      <div className="f06-badges" aria-label="Credenciales"><span>ITESO</span><span>Cédula 13782054</span><span>TCC</span></div>
      <PrimaryButton onClick={() => router.push(routes.testimonial)}>Continuar</PrimaryButton>
    </section>
    <Image className="f06-photo" src="/assets/f02-miriam-pointing.png" alt="Miriam Yanagui" width={455} height={682} priority />
  </MobileScreen>;
}
