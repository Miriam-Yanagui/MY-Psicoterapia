import Image from "next/image";
import { motion, type HTMLMotionProps } from "motion/react";
import { useReducedMotion } from "@/lib/motion";

type Props = Omit<HTMLMotionProps<"button">, "children"> & { children?: React.ReactNode; motionFeedback?: boolean };

export function PrimaryButton({ children, className = "", motionFeedback = false, ...props }: Props) {
  const reduced = useReducedMotion();
  return <motion.button className={`primary-button ${className}`} whileTap={motionFeedback && !reduced ? { scale: 0.98 } : undefined} transition={motionFeedback ? { duration: 0.12, ease: "easeOut" } : undefined} {...props}><span>{children}</span><Image src="/assets/f02-arrow-right.png" alt="" width={18} height={18} /></motion.button>;
}
