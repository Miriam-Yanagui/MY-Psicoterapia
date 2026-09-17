"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenLift } from "@/components/ui/ScreenLift";
import { useReducedMotion } from "@/lib/motion";
import { routes } from "@/lib/flow";

const ease = [0.25, 0.1, 0.25, 1] as const;

const curveVariants = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0 },
};

const item = (delay: number, y = 10) => ({
  hidden: { opacity: 0, y },
  visible: { opacity: 1, y: 0, transition: { delay, duration: 0.4, ease } },
});

export default function HomePage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const r = !mounted || reduced;

  return (
    <MobileScreen className="f01">
      <ScreenLift contentBottom={805} maxLift={100}>
      <motion.div
        initial={r ? { opacity: 0 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={r ? { duration: 0.15 } : { duration: 0 }}
      >
        <Image
          className="f01-photo"
          src="/assets/f01-miriam-home.png"
          alt="Miriam Yanagui"
          width={390}
          height={693}
          priority
        />

        <motion.div
          className="f01-curve-wrap"
          variants={r ? undefined : curveVariants}
          initial={r ? { opacity: 1 } : "hidden"}
          animate={r ? { opacity: 1 } : "visible"}
          transition={r ? { duration: 0.15 } : { delay: 0.08, duration: 0.48, ease }}
        >
          <svg className="f01-curve" viewBox="0 0 390 844" aria-hidden="true">
            <path
              fill="#FAF4E9"
              d="M0,438.9219055175781C85,438.9219055175781,120,407,195,407C270,407,305,438.9219055175781,390,438.9219055175781L390,844L0,844Z"
            />
          </svg>
        </motion.div>

        <motion.div
          variants={r ? undefined : item(0.24, 10)}
          initial={r ? { opacity: 1 } : "hidden"}
          animate={r ? { opacity: 1 } : "visible"}
        >
          <Image
            className="f01-logo"
            src="/assets/f01-logo-my-naranja.png"
            alt=""
            width={42}
            height={30}
          />
        </motion.div>

        <motion.p
          className="f01-eyebrow"
          variants={r ? undefined : item(0.24, 10)}
          initial={r ? { opacity: 1 } : "hidden"}
          animate={r ? { opacity: 1 } : "visible"}
        >
          TERAPIA POR VIDEOLLAMADA
        </motion.p>

        <motion.span
          className="f01-accent"
          variants={r ? undefined : item(0.28, 6)}
          initial={r ? { opacity: 1 } : "hidden"}
          animate={r ? { opacity: 1 } : "visible"}
        />

        <motion.h1
          className="f01-title"
          variants={r ? undefined : item(0.34, 12)}
          initial={r ? { opacity: 1 } : "hidden"}
          animate={r ? { opacity: 1 } : "visible"}
        >
          Un espacio para
          <br />
          <span>comprenderte</span>
          <br />
          y comenzar a
          <br />
          generar cambios.
        </motion.h1>

        <motion.div
          initial={r ? { opacity: 1 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={r ? { duration: 0.15 } : { delay: 0.48, duration: 0.36, ease }}
        >
          <PrimaryButton
            className="f01-button"
            motionFeedback
            onClick={() => router.push(routes.name)}
          >
            Comenzar
          </PrimaryButton>
        </motion.div>

        <motion.p
          className="f01-aux"
          variants={r ? undefined : item(0.60, 8)}
          initial={r ? { opacity: 1 } : "hidden"}
          animate={r ? { opacity: 1 } : "visible"}
        >
          4 preguntas · menos de 1 minuto · para agendar
        </motion.p>

        <motion.p
          className="f01-payment"
          variants={r ? undefined : item(0.64, 6)}
          initial={r ? { opacity: 1 } : "hidden"}
          animate={r ? { opacity: 1 } : "visible"}
        >
          Pago con tarjeta · <strong>$5 MXN</strong> · 50 minutos
        </motion.p>
      </motion.div>
      </ScreenLift>
    </MobileScreen>
  );
}
