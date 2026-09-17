"use client";

import { motion } from "motion/react";

export function CelebrationMoment({ reduced }: { reduced: boolean }) {
  return (
    <div className="f12-celebration" aria-hidden="true">
      <motion.span
        className="f12-celebration-main"
        initial={reduced ? false : { opacity: 0, scale: 0.55, rotate: -18, y: 8 }}
        animate={reduced ? undefined : { opacity: 1, scale: [0.55, 1.14, 1], rotate: [-18, 8, 0], y: [8, -4, 0] }}
        transition={{ duration: 0.85, delay: 0.12, ease: "easeOut" }}
      >
        🎉
      </motion.span>
      <motion.span
        className="f12-celebration-spark f12-celebration-spark--left"
        initial={reduced ? false : { opacity: 0, scale: 0 }}
        animate={reduced ? undefined : { opacity: [0, 1, 0.8], scale: [0, 1.25, 1], rotate: [-20, 8, 0] }}
        transition={{ duration: 0.65, delay: 0.55, ease: "easeOut" }}
      >
        ✨
      </motion.span>
      <motion.span
        className="f12-celebration-spark f12-celebration-spark--right"
        initial={reduced ? false : { opacity: 0, scale: 0 }}
        animate={reduced ? undefined : { opacity: [0, 1, 0.8], scale: [0, 1.2, 1], rotate: [18, -6, 0] }}
        transition={{ duration: 0.65, delay: 0.68, ease: "easeOut" }}
      >
        🎊
      </motion.span>
    </div>
  );
}
