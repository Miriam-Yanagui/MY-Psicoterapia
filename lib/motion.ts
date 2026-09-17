import { useReducedMotion as useMotionReducedMotion } from "motion/react";

export const pageTransition = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] },
} as const;

export const stepTransition = pageTransition;

export const tapFeedback = {
  whileTap: { scale: 0.98 },
  transition: { duration: 0.12, ease: "easeOut" },
} as const;

export const emotionSelect = {
  transition: { duration: 0.2, ease: "easeOut" },
} as const;

export const trustFade = {
  page: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] },
  },
  reduced: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.15 },
  },
} as const;

export function useReducedMotion(): boolean {
  return useMotionReducedMotion() ?? false;
}
