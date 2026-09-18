"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { EmotionOption } from "@/components/onboarding/EmotionOption";
import { QuestionHeader } from "@/components/onboarding/QuestionHeader";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PageTransition } from "@/components/ui/PageTransition";
import { FlowNav } from "@/components/ui/FlowNav";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { ScreenLift } from "@/components/ui/ScreenLift";
import { useOnboarding } from "@/context/OnboardingProvider";
import type { Emotion } from "@/lib/types";
import { routes } from "@/lib/flow";
import { primeRevealSound } from "@/lib/revealSound";

const emotions: Emotion[] = ["Bien","Preocupado/a","Cansado/a","Con estrés","Triste","Frustrado/a","Pensativo/a","No estoy seguro/a"];

export default function EmotionPage() {
  const router = useRouter();
  const { state, dispatch } = useOnboarding(); const displayName = state.name.trim() || "Andrea";
  return <MobileScreen className="f03">
    <PageTransition>
      <Image className="watermark" src="/assets/f02-watermark.png" alt="" width={390} height={844} priority />
      <ScreenLift contentBottom={805} maxLift={40}>
      <ProgressDots active={2} />
      <section className="f03-card" aria-labelledby="emotion-title">
        <QuestionHeader>PREGUNTA 2 DE 4</QuestionHeader><h1 id="emotion-title">Hola, {displayName}.<br/>¿Cómo te has sentido<br/>últimamente?</h1>
        <div className="emotion-options">{emotions.map((emotion) => <EmotionOption key={emotion} emotion={emotion} selected={state.emotion === emotion} onSelect={() => dispatch({ type: "selectEmotion", emotion })} />)}</div>
        <FlowNav
          backHref={routes.name}
          disabled={!state.emotion}
          onContinue={() => {
            primeRevealSound();
            router.push(routes.pause);
          }}
        />
      </section>
      </ScreenLift>
    </PageTransition>
  </MobileScreen>;
}
