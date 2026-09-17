"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { GoalOption } from "@/components/onboarding/GoalOption";
import { QuestionHeader } from "@/components/onboarding/QuestionHeader";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { FlowNav } from "@/components/ui/FlowNav";
import { ScreenLift } from "@/components/ui/ScreenLift";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { useOnboarding } from "@/context/OnboardingProvider";
import { useReducedMotion } from "@/lib/motion";
import { routes } from "@/lib/flow";
import type { Goal } from "@/lib/types";

const goals: Goal[] = ["Entender lo que siento", "Sentirme con más calma", "Mejorar mis relaciones", "Atravesar un cambio", "Conocerme mejor", "Prefiero hablarlo en sesión"];
const goalEmoji: Record<Goal, string> = {
  "Entender lo que siento": "🧩",
  "Sentirme con más calma": "🌿",
  "Mejorar mis relaciones": "🤝",
  "Atravesar un cambio": "🌊",
  "Conocerme mejor": "🪞",
  "Prefiero hablarlo en sesión": "💬",
};

export default function GoalsPage() {
  const router = useRouter();
  const { state, dispatch } = useOnboarding();
  const reduced = useReducedMotion();
  return <MobileScreen className="f07">
    <motion.div
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={reduced ? { duration: 0.15 } : { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="cream-watermark" aria-hidden="true" />
      <ScreenLift contentBottom={780} maxLift={70}>
      <ProgressDots active={4} />
      <section className="f07-card" aria-labelledby="goals-title">
        <QuestionHeader>PREGUNTA 4 DE 4</QuestionHeader>
        <h1 id="goals-title">¿Qué te gustaría<br />encontrar en terapia?</h1>
        <div className="goal-options">{goals.map((goal) => { const selected = state.goals.includes(goal); return <GoalOption key={goal} value={goal} emoji={goalEmoji[goal]} selected={selected} disabled={false} onToggle={() => dispatch({ type: "toggleGoal", goal })} />; })}</div>
        <div className="f07-notes">
          <label className="f07-notes-label" htmlFor="goals-notes">Hay algo más que quiero contar</label>
          <textarea id="goals-notes" className="f07-notes-input" placeholder="Opcional…" value={state.goalsAdditionalNotes} onChange={(e) => dispatch({ type: "setGoalsAdditionalNotes", notes: e.target.value })} rows={3} />
        </div>
        <FlowNav
          className="f07-button"
          backHref={routes.experience}
          disabled={state.goals.length === 0}
          onContinue={() => router.push(routes.testimonial)}
        />
      </section>
      </ScreenLift>
    </motion.div>
  </MobileScreen>;
}
