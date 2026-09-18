"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { FlowNav } from "@/components/ui/FlowNav";
import { useReducedMotion } from "@/lib/motion";
import { useOnboarding } from "@/context/OnboardingProvider";
import { routes } from "@/lib/flow";

export default function MiriamPage() {
  const router = useRouter();
  const { state } = useOnboarding();
  const name = state.name.trim() || "Andrea";
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const show = mounted && !reduced;
  const fadeOnly = !mounted || reduced;

  return <MobileScreen className="f06">
    <span className="f06-accent f06-accent--top" aria-hidden="true" /><span className="f06-accent f06-accent--bottom" aria-hidden="true" />
    <motion.section
      className="f06-card"
      aria-labelledby="miriam-title"
      initial={fadeOnly ? { opacity: 0 } : { opacity: 0, y: 9 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: show ? 0.1 : 0, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <p>HOLA, {name.toLocaleUpperCase("es-MX")}.</p>
      <h1 id="miriam-title">Soy la Psico. Miriam Yanagui.</h1>
      <motion.div
        className="f06-portrait"
        initial={fadeOnly ? { opacity: 0 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: show ? 0.22 : 0, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Image src="/assets/miriam-portrait-square.png" alt="Psicóloga Miriam Yanagui" width={516} height={519} priority />
      </motion.div>
      <p className="f06-specialty">Psicóloga y psicoterapeuta con maestría en<br />Psicoterapia Cognitivo-Conductual.</p>
      <p className="f06-body">Con lo que me compartiste, podemos comenzar a trabajar juntas a tu ritmo.</p>
      <div className="f06-badges" aria-label="Credenciales"><span>ITESO</span><span>Cédula 13782054</span><span>TCC</span></div>
      <FlowNav
        className="f06-button"
        backHref={routes.orientation}
        continueLabel="Elegir mi sesión"
        onContinue={() => router.push(routes.schedule)}
        initial={fadeOnly ? { opacity: 0 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: show ? 0.35 : 0, duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      />
    </motion.section>
  </MobileScreen>;
}
