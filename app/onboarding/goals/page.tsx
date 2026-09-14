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
      <div className="goal-options">{goals.map((goal) => { const selected = state.goals.includes(goal); return <GoalOption key={goal} value={goal} selected={selected} disabled={false} onToggle={() => dispatch({ type: "toggleGoal", goal })} />; })}</div>
      <div className="f07-notes">
        <label className="f07-notes-label" htmlFor="goals-notes">Hay algo más que quiero contar</label>
        <textarea id="goals-notes" className="f07-notes-input" placeholder="Opcional…" value={state.goalsAdditionalNotes} onChange={(e) => dispatch({ type: "setGoalsAdditionalNotes", notes: e.target.value })} rows={3} />
      </div>
      <PrimaryButton className="f07-button" disabled={state.goals.length === 0} onClick={() => router.push(routes.orientation)}>Continuar</PrimaryButton>
    </section>
  </MobileScreen>;
}
