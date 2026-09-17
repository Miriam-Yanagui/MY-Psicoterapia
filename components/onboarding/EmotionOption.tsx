import { useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useReducedMotion } from "@/lib/motion";
import { emojiByEmotion } from "@/lib/emotions";
import type { Emotion } from "@/lib/types";

const labelByEmotion: Record<Emotion, string> = {
  "Bien": "Bien",
  "Preocupado/a": "Inquietud",
  "Cansado/a": "Cansancio",
  "Con estrés": "Estrés",
  "Triste": "Tristeza",
  "Frustrado/a": "Frustración",
  "Pensativo/a": "Pensando",
  "No estoy seguro/a": "No sé",
};

export function EmotionOption({ emotion, selected, onSelect }: { emotion: Emotion; selected: boolean; onSelect: () => void }) {
  const reduced = useReducedMotion();
  const prevRef = useRef(selected);
  const scaleVal = useMotionValue(1);
  const scale = useTransform(scaleVal, (v) => v);

  useEffect(() => {
    if (!prevRef.current && selected && !reduced) {
      animate(scaleVal, [1, 1.025, 1], { duration: 0.25, ease: "easeOut" });
    }
    prevRef.current = selected;
  }, [selected, reduced, scaleVal]);

  return <motion.button type="button" className="emotion-option" aria-pressed={selected} onClick={onSelect} style={{ scale }} whileTap={!reduced ? { scale: 0.98 } : undefined} transition={{ duration: 0.12, ease: "easeOut" }}>
    <span className="emotion-emoji" aria-hidden="true">{emojiByEmotion[emotion]}</span>
    <span className="emotion-label">{labelByEmotion[emotion]}</span>
  </motion.button>;
}
