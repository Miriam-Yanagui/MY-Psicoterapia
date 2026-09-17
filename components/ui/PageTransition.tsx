"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/lib/motion";

export function PageTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0 }}
      transition={reduced ? { duration: 0.15 } : { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
