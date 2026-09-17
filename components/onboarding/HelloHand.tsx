"use client";

import { motion } from "motion/react";
import { useReducedMotion } from "@/lib/motion";

export function HelloHand() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="f02-hello"
      role="img"
      aria-label="Mano saludando"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <motion.span
        className="f02-hello-emoji"
        animate={reduceMotion ? undefined : { rotate: [0, -12, 12, -9, 8, 0] }}
        transition={{ duration: 1.15, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.8 }}
      >
        👋
      </motion.span>
      <motion.span
        className="f02-hello-spark f02-hello-spark--one"
        aria-hidden="true"
        animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35], scale: [0.85, 1.12, 0.85] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        ✨
      </motion.span>
      <motion.span
        className="f02-hello-spark f02-hello-spark--two"
        aria-hidden="true"
        animate={reduceMotion ? undefined : { opacity: [1, 0.35, 1], scale: [1.08, 0.85, 1.08] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        ✨
      </motion.span>
    </motion.div>
  );
}
