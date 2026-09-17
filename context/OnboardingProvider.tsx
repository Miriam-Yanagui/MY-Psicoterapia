"use client";

import { createContext, type Dispatch, type ReactNode, useContext, useMemo, useReducer } from "react";
import { reducer, initialState } from "@/lib/reducer";

const OnboardingContext = createContext<{ state: import("@/lib/types").OnboardingState; dispatch: Dispatch<import("@/lib/types").OnboardingAction> } | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used within OnboardingProvider");
  return value;
}
