"use client";

import { type ReactNode, useLayoutEffect, useState } from "react";
import { calculateScreenLift } from "@/lib/screenFit";

export function ScreenLift({
  children,
  contentBottom,
  maxLift,
  safeBottom = 16,
  minFitHeight = 700,
  respectSafeArea = false,
}: {
  children: ReactNode;
  contentBottom: number;
  maxLift: number;
  safeBottom?: number;
  minFitHeight?: number;
  respectSafeArea?: boolean;
}) {
  const [lift, setLift] = useState(0);

  useLayoutEffect(() => {
    function updateLift() {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const safeAreaBottom = respectSafeArea
        ? Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-bottom")) || 0
        : 0;
      setLift(calculateScreenLift({
        viewportWidth: window.innerWidth,
        viewportHeight,
        contentBottom,
        safeBottom: safeBottom + safeAreaBottom,
        maxLift,
        minFitHeight,
      }));
    }

    updateLift();
    window.addEventListener("resize", updateLift);
    window.visualViewport?.addEventListener("resize", updateLift);
    return () => {
      window.removeEventListener("resize", updateLift);
      window.visualViewport?.removeEventListener("resize", updateLift);
    };
  }, [contentBottom, maxLift, minFitHeight, respectSafeArea, safeBottom]);

  return <div className="screen-lift" style={{ "--screen-lift": `${-lift}px` } as React.CSSProperties}>{children}</div>;
}
