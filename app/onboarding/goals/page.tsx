"use client";

import { useRouter } from "next/navigation";
import { GoalOption } from "@/components/onboarding/GoalOption";
import { QuestionHeader } from "@/components/onboarding/QuestionHeader";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { useOnboarding } from "@/context/OnboardingProvider";
import { routes } from "@/lib/flow";
import type { Goal } from "@/lib/types";

const goals: Goal[] = ["Entender lo que siento", "Sentirme con más calma", "Mejorar mis relaciones", "Atravesar un cambio", "Conocerme mejor", "Prefiero hablarlo en sesión"];

export default function GoalsPage() {
  const router = useRouter();
  const { state, dispatch } = useOnboarding();
  return <MobileScreen className="f07">
    <div className="cream-watermark" aria-hidden="true" /><ProgressDots active={4} />
    <section className="f07-card" aria-labelledby="goals-title">
      <QuestionHeader>PREGUNTA 4 DE 4</QuestionHeader>
      <h1 id="goals-title">¿Qué te gustaría<br />encontrar en terapia?</h1>
      <p className="f07-support">Elige hasta dos opciones.</p>
      <div className="goal-options">{goals.map((goal) => { const selected = state.goals.includes(goal); return <GoalOption key={goal} value={goal} selected={selected} disabled={!selected && state.goals.length >= 2} onToggle={() => dispatch({ type: "toggleGoal", goal })} />; })}</div>
      <PrimaryButton className="f07-button" disabled={state.goals.length === 0} onClick={() => router.push(routes.orientation)}>Continuar</PrimaryButton>
    </section>
  </MobileScreen>;
}
