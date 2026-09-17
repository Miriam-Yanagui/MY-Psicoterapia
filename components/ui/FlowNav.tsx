"use client";

import Image from "next/image";
import { motion, type MotionProps } from "motion/react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "@/lib/motion";

type Props = {
  backHref: string;
  continueLabel?: string;
  continueType?: "button" | "submit";
  onContinue?: () => void;
  disabled?: boolean;
  className?: string;
  initial?: MotionProps["initial"];
  animate?: MotionProps["animate"];
  transition?: MotionProps["transition"];
};

export function FlowNav({
  backHref,
  continueLabel = "Continuar",
  continueType = "button",
  onContinue,
  disabled = false,
  className = "",
  initial,
  animate,
  transition,
}: Props) {
  const router = useRouter();
  const reduced = useReducedMotion();

  return (
    <motion.nav
      className={`flow-nav ${className}`}
      aria-label="Navegación del formulario"
      initial={initial}
      animate={animate}
      transition={transition}
    >
      <motion.button
        className="flow-nav-back"
        type="button"
        aria-label="Pantalla anterior"
        whileTap={!reduced ? { scale: 0.97 } : undefined}
        transition={{ duration: 0.1, ease: "easeOut" }}
        onClick={() => router.push(backHref)}
      >
        <Image
          src="/assets/f02-arrow-right.png"
          alt=""
          width={18}
          height={18}
          className="flow-nav-arrow--back"
        />
      </motion.button>
      <motion.button
        className="flow-nav-continue"
        type={continueType}
        disabled={disabled}
        whileTap={!reduced && !disabled ? { scale: 0.98 } : undefined}
        transition={{ duration: 0.12, ease: "easeOut" }}
        onClick={onContinue}
      >
        <span className="flow-nav-label">{continueLabel}</span>
        <Image
          src="/assets/f02-arrow-right.png"
          alt=""
          width={18}
          height={18}
          className="flow-nav-arrow--continue"
        />
      </motion.button>
    </motion.nav>
  );
}
