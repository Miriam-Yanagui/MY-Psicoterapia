"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { FlowNav } from "@/components/ui/FlowNav";
import { ScreenLift } from "@/components/ui/ScreenLift";
import { useOnboarding } from "@/context/OnboardingProvider";
import { useReducedMotion } from "@/lib/motion";
import { routes } from "@/lib/flow";

export default function OrientationPage() {
  const router = useRouter();
  const { state } = useOnboarding();
  const reduced = useReducedMotion();
  const name = state.name.trim() || "Andrea";
  return <MobileScreen className="f08">
    <motion.div
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={reduced ? { duration: 0.15 } : { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="f08-watermark f08-watermark--top" aria-hidden="true" /><div className="f08-watermark f08-watermark--bottom" aria-hidden="true" />
      <ScreenLift contentBottom={812} maxLift={100}>
      <article className="f08-card">
        <p className="f08-eyebrow">LO QUE NOS COMPARTISTE</p><p className="f08-chip">Para {name}</p>
        <div className="f08-saved" aria-hidden="true"><motion.span animate={reduced ? undefined : { y: [0, -5, 0], rotate: [0, -3, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}>📩</motion.span><i>✨</i></div>
        <h1>Gracias por<br />compartirlo.</h1>
        <p className="f08-response">Tus respuestas pueden servir como punto de partida para conversar con la Psico. Miriam Yanagui en una primera sesión.</p>
        <div className="f08-divider" aria-hidden="true" />
        <section className="f08-work f08-work--context" aria-label="Sobre tus respuestas"><h2>Un espacio seguro para comenzar</h2><p>La Psico. Miriam Yanagui podrá escucharte directamente, hacerte las preguntas adecuadas y explorar contigo lo que hoy sea importante.</p><p>Estas respuestas no son un diagnóstico ni una evaluación clínica.</p></section>
        <FlowNav
          className="f08-button"
          backHref={routes.testimonial}
          onContinue={() => router.push(routes.miriam)}
        />
        <p className="f08-context">Tú decides qué quieres compartir y a qué ritmo.</p>
      </article>
      </ScreenLift>
    </motion.div>
  </MobileScreen>;
}
