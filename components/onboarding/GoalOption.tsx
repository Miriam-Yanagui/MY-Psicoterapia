import { useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import type { Goal } from "@/lib/types";

export function GoalOption({ value, emoji, selected, disabled, onToggle }: { value: Goal; emoji: string; selected: boolean; disabled: boolean; onToggle: () => void }) {
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

  return <motion.button className="goal-option" type="button" aria-pressed={selected} disabled={disabled} onClick={onToggle} style={{ scale }} whileTap={!reduced ? { scale: 0.98 } : undefined} transition={{ duration: 0.12, ease: "easeOut" }}>
    <span><b className="goal-option-emoji" aria-hidden="true">{emoji}</b>{value}</span><motion.i aria-hidden="true" initial={false} animate={{ opacity: selected ? 1 : 0, scale: selected ? 1 : 0.85 }} transition={{ duration: 0.18, ease: "easeOut" }} style={{ transformOrigin: "center" }} />
  </motion.button>;
}
