"use client";

import { motion } from "motion/react";

const particles = [
  { angle: 0, delay: 0, size: 6, opacity: 0.5 },
  { angle: 45, delay: 0.06, size: 5, opacity: 0.4 },
  { angle: 90, delay: 0.03, size: 7, opacity: 0.55 },
  { angle: 135, delay: 0.09, size: 4, opacity: 0.35 },
  { angle: 180, delay: 0.04, size: 6, opacity: 0.45 },
  { angle: 225, delay: 0.08, size: 5, opacity: 0.5 },
  { angle: 270, delay: 0.02, size: 8, opacity: 0.4 },
  { angle: 315, delay: 0.07, size: 5, opacity: 0.45 },
];

const RADIUS = 45;

function getXY(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
}

export function HeartBreath({ reduced }: { reduced: boolean }) {
  if (reduced) return null;

  return (
    <div className="f04-particles" aria-hidden="true">
      {particles.map((p, i) => {
        const end = getXY(p.angle, RADIUS);
        return (
          <motion.span
            key={i}
            className="f04-particle"
            style={{
              width: p.size,
              height: p.size,
            }}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, p.opacity, p.opacity, 0],
              scale: [0, 1, 1, 0.5],
              x: [0, end.x, end.x, 0],
              y: [0, end.y, end.y, 0],
            }}
            transition={{
              duration: 2.2,
              delay: p.delay,
              times: [0, 0.35, 0.6, 1],
              ease: "easeInOut",
            }}
          />
        );
      })}
      <motion.span
        className="f04-heart"
        style={{ x: "-50%", y: "-50%" }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: [0.8, 1, 1.04, 1] }}
        transition={{ delay: 1.5, duration: 1.0, ease: "easeOut", scale: { delay: 1.5, duration: 0.8, times: [0, 0.6, 0.8, 1] } }}
      >
        ❤️
      </motion.span>
    </div>
  );
}
