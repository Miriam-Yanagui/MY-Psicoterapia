"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";
import { HelloHand } from "@/components/onboarding/HelloHand";
import { QuestionHeader } from "@/components/onboarding/QuestionHeader";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PageTransition } from "@/components/ui/PageTransition";
import { FlowNav } from "@/components/ui/FlowNav";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { useOnboarding } from "@/context/OnboardingProvider";
import { routes } from "@/lib/flow";

export default function NamePage() {
  const router = useRouter(); const { state, dispatch } = useOnboarding(); const valid = state.name.trim().length > 0;
  function submit(event: FormEvent) { event.preventDefault(); if (valid) router.push(routes.emotion); }
  return <MobileScreen className="f02">
    <PageTransition>
      <Image className="watermark" src="/assets/f02-watermark.png" alt="" width={390} height={844} priority />
      <div className="brand-pattern" /><ProgressDots active={1} />
      <form className="f02-card" onSubmit={submit}>
        <QuestionHeader>PREGUNTA 1 DE 4</QuestionHeader><h1>Antes de<br/>comenzar, ¿cómo<br/>te llamas?</h1>
        <label className="sr-only" htmlFor="name">Nombre</label>
        <input id="name" name="name" autoComplete="given-name" placeholder="Por ejemplo: Andrea" value={state.name} onChange={(e) => dispatch({ type: "setName", name: e.target.value })} />
        <FlowNav
          backHref={routes.home}
          continueType="submit"
          disabled={!valid}
        />
      </form>
      <HelloHand />
    </PageTransition>
  </MobileScreen>;
}
