"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { applyAnalyticsOverrideFromUrl, trackFunnelEvent, type FunnelEvent } from "@/lib/funnel-analytics";

const pageEvents: Record<string, FunnelEvent> = {
  "/onboarding/home": "onboarding_started",
  "/onboarding/name": "name_reached",
  "/onboarding/emotion": "emotion_reached",
  "/onboarding/experience": "experience_reached",
  "/onboarding/goals": "goals_reached",
  "/onboarding/schedule": "schedule_reached",
  "/onboarding/checkout": "checkout_reached",
  "/onboarding/confirmation": "confirmation_reached",
};

export function FunnelTracker() {
  const pathname = usePathname();

  useEffect(() => {
    applyAnalyticsOverrideFromUrl();
    const event = pageEvents[pathname];
    if (event) trackFunnelEvent(event);

    const consentUpdated = () => { if (event) trackFunnelEvent(event); };
    window.addEventListener("miriam:consent-updated", consentUpdated);
    return () => window.removeEventListener("miriam:consent-updated", consentUpdated);
  }, [pathname]);

  return null;
}
