"use client";

import { motion } from "motion/react";
import { emojiByEmotion } from "@/lib/emotions";
import type { Emotion } from "@/lib/types";

const companions: Record<Emotion, [string, string]> = {
  "Bien": ["✨", "✨"],
  "Preocupado/a": ["💭", "✨"],
  "Cansado/a": ["💤", "✨"],
  "Con estrés": ["💨", "✨"],
  "Triste": ["💧", "✨"],
  "Frustrado/a": ["💥", "✨"],
  "Pensativo/a": ["💭", "✨"],
  "No estoy seguro/a": ["❔", "✨"],
};

export function EmotionMoment({ emotion, reduced }: { emotion: Emotion | null; reduced: boolean }) {
  const selectedEmotion = emotion ?? "No estoy seguro/a";
  const [leftCompanion, rightCompanion] = companions[selectedEmotion];

  return (
    <div className="f04-emotion-moment" aria-hidden="true">
      <motion.span
        className="f04-emotion-companion f04-emotion-companion--left"
        initial={reduced ? false : { opacity: 0, scale: 0.5, rotate: -15 }}
        animate={reduced ? undefined : { opacity: [0, 1, 0.75], scale: [0.5, 1.12, 1], rotate: [-15, 8, 0] }}
        transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
      >
        {leftCompanion}
      </motion.span>
      <motion.span
        className="f04-emotion-emoji"
        initial={reduced ? false : { opacity: 0, scale: 0.72, y: 8 }}
        animate={reduced ? undefined : { opacity: 1, scale: [0.72, 1.08, 1], y: [8, -3, 0] }}
        transition={{ delay: 0.65, duration: 0.9, ease: "easeOut" }}
      >
        {emojiByEmotion[selectedEmotion]}
      </motion.span>
      <motion.span
        className="f04-emotion-companion f04-emotion-companion--right"
        initial={reduced ? false : { opacity: 0, scale: 0.5, rotate: 15 }}
        animate={reduced ? undefined : { opacity: [0, 1, 0.75], scale: [0.5, 1.12, 1], rotate: [15, -8, 0] }}
        transition={{ delay: 1.05, duration: 0.8, ease: "easeOut" }}
      >
        {rightCompanion}
      </motion.span>
    </div>
  );
}
