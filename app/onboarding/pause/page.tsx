"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { FlowNav } from "@/components/ui/FlowNav";
import { EmotionMoment } from "@/components/ui/EmotionMoment";
import { ScreenLift } from "@/components/ui/ScreenLift";
import { useReducedMotion } from "@/lib/motion";
import { useOnboarding } from "@/context/OnboardingProvider";
import { routes } from "@/lib/flow";
import type { Emotion } from "@/lib/types";

const emotionCopies: Record<Emotion, string> = {
  "Bien": "Si hoy te sientes bien, también vale la pena hacer una pausa y escucharte.",
  "Preocupado/a": "No necesitas resolverlo todo en este momento.",
  "Cansado/a": "Por unos segundos, puedes bajar el ritmo.",
  "Con estrés": "No tienes que ir más rápido. Por un momento, sólo respira.",
  "Triste": "Darle espacio a lo que hoy pesa también es escucharte.",
  "Frustrado/a": "No necesitas tener la respuesta ahora mismo.",
  "Pensativo/a": "Observar lo que pasa dentro también es una forma de empezar.",
  "No estoy seguro/a": "No necesitas saber exactamente qué sientes para poder empezar.",
};

const FALLBACK_COPY = "Tomarte un momento para escucharte ya es una forma de empezar.";
const SESSION_KEY = "f04-visited";

export default function PausePage() {
  const router = useRouter();
  const { state } = useOnboarding();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [visited, setVisited] = useState(true);

  useEffect(() => {
    const wasVisited = sessionStorage.getItem(SESSION_KEY) === "1";
    setVisited(wasVisited);
    setMounted(true);
    if (!wasVisited) sessionStorage.setItem(SESSION_KEY, "1");
  }, []);

  const isFirstVisit = mounted && !visited && !reduced;
  const isRevisit = mounted && (visited || reduced);
  const fadeDuration = isRevisit ? 0.5 : undefined;

  const emotion = state.emotion;
  const copy = emotion ? emotionCopies[emotion] : FALLBACK_COPY;

  if (!mounted) {
    return (
      <MobileScreen className="f04">
        <div className="cream-watermark" aria-hidden="true" />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen className="f04">
      <div className="cream-watermark" aria-hidden="true" />
      <ScreenLift contentBottom={805} maxLift={100}>

      <motion.p
        className="f04-eyebrow"
        initial={{ opacity: 0, y: isFirstVisit ? 7 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: isRevisit ? 0 : 0.2,
          duration: isRevisit ? fadeDuration! : 0.5,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        UN MOMENTO PARA TI
      </motion.p>

      <motion.p
        className="f04-emotion-copy"
        initial={{ opacity: 0, y: isFirstVisit ? 8 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: isRevisit ? 0.1 : 0.7,
          duration: isRevisit ? fadeDuration! : 0.6,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {copy}
      </motion.p>

      <EmotionMoment emotion={emotion} reduced={reduced} />

      <FlowNav
        className="f04-button"
        backHref={routes.emotion}
        onContinue={() => router.push(routes.experience)}
        initial={{ opacity: 0, y: isFirstVisit ? 6 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: isRevisit ? 0.2 : 2.8,
          duration: isRevisit ? fadeDuration! : 0.4,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      />
      </ScreenLift>
    </MobileScreen>
  );
}
