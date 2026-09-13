"use client";

import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useOnboarding } from "@/context/OnboardingProvider";
import { routes } from "@/lib/flow";

export default function OrientationPage() {
  const router = useRouter();
  const { state } = useOnboarding();
  const name = state.name.trim() || "Andrea";
  return <MobileScreen className="f08">
    <BrandMark inverse />
    <div className="f08-watermark f08-watermark--top" aria-hidden="true" /><div className="f08-watermark f08-watermark--bottom" aria-hidden="true" />
    <article className="f08-card">
      <p className="f08-eyebrow">LO QUE NOS COMPARTISTE</p><p className="f08-chip">Para {name}</p>
      <h1>Esto que sientes<br />tiene sentido.</h1>
      <p className="f08-response">Lo que estás viviendo merece espacio, calma y claridad. Podemos explorarlo juntas, a tu ritmo.</p>
      <div className="f08-divider" aria-hidden="true" />
      <section className="f08-work" aria-label="Orientación"><h2>Lo que podemos trabajar juntas:</h2><ul><li>Reconocer lo que detona el estrés</li><li>Recuperar calma en tu día a día</li><li>Comprenderte con mayor claridad</li></ul></section>
      <PrimaryButton onClick={() => router.push(routes.schedule)}>Continuar</PrimaryButton>
      <p className="f08-context">Tu respuesta nos ayuda a mostrarte una orientación más adecuada.</p>
    </article>
  </MobileScreen>;
}
