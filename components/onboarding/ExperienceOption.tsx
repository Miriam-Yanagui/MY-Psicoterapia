import { useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import type { TherapyExperience } from "@/lib/types";

export function ExperienceOption({ value, selected, onSelect }: { value: TherapyExperience; selected: boolean; onSelect: () => void }) {
  const reduced = useReducedMotion();
  const prevRef = useRef(selected);
  const scaleVal = useMotionValue(1);
  const scale = useTransform(scaleVal, (v) => v);

  useEffect(() => {
    if (!prevRef.current && selected && !reduced) {
      animate(scaleVal, [1, 1.015, 1], { duration: 0.22, ease: "easeOut" });
    }
    prevRef.current = selected;
  }, [selected, reduced, scaleVal]);

  return <motion.button className="experience-option" type="button" aria-pressed={selected} onClick={onSelect} style={{ scale }} whileTap={!reduced ? { scale: 0.98 } : undefined} transition={{ duration: 0.12, ease: "easeOut" }}>
    <span>{value}</span>
    <motion.svg viewBox="0 0 18 18" aria-hidden="true" initial={false} animate={{ opacity: selected ? 1 : 0, scale: selected ? 1 : 0.85 }} transition={{ duration: 0.18, ease: "easeOut" }} style={{ transformOrigin: "center" }}><path d="M2.25 9.75 6.75 14.25 15.75 4.5" /></motion.svg>
  </motion.button>;
}
