"use client";

import { useRouter } from "next/navigation";
import { ExperienceOption } from "@/components/onboarding/ExperienceOption";
import { QuestionHeader } from "@/components/onboarding/QuestionHeader";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PageTransition } from "@/components/ui/PageTransition";
import { FlowNav } from "@/components/ui/FlowNav";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { ScreenLift } from "@/components/ui/ScreenLift";
import { useOnboarding } from "@/context/OnboardingProvider";
import { routes } from "@/lib/flow";
import type { TherapyExperience } from "@/lib/types";

const experiences: TherapyExperience[] = ["Primera vez", "He asistido antes", "Estoy retomándola"];

export default function ExperiencePage() {
  const router = useRouter();
  const { state, dispatch } = useOnboarding();
  return <MobileScreen className="f05">
    <PageTransition>
      <div className="cream-watermark" aria-hidden="true" />
      <ScreenLift contentBottom={805} maxLift={40}>
      <ProgressDots active={3} />
      <section className="f05-card" aria-labelledby="experience-title">
        <QuestionHeader>PREGUNTA 3 DE 4</QuestionHeader>
        <h1 id="experience-title">¿Qué tan familiar<br />te resulta la terapia?</h1>
        <div className="experience-options">{experiences.map((experience) => <ExperienceOption key={experience} value={experience} selected={state.therapyExperience === experience} onSelect={() => dispatch({ type: "selectExperience", experience })} />)}</div>
        <FlowNav
          backHref={routes.pause}
          disabled={!state.therapyExperience}
          onContinue={() => router.push(routes.goals)}
        />
      </section>
      </ScreenLift>
    </PageTransition>
  </MobileScreen>;
}
