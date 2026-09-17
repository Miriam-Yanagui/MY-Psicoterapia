"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { FlowNav } from "@/components/ui/FlowNav";
import { ScreenLift } from "@/components/ui/ScreenLift";
import { useReducedMotion } from "@/lib/motion";
import { routes } from "@/lib/flow";

interface Testimonial {
  id: string;
  name: string;
  quote: string;
  rating: number;
  source: string;
  portrait: string;
}

const testimonials: Testimonial[] = [
  {
    id: "mariana-saldivar",
    name: "Mariana Saldivar",
    quote: "Miriam ha sido excelente tanto en lo profesional como en su calidez humana.",
    rating: 5,
    source: "Doctoralia",
    portrait: "/assets/f06b-testimonial-portrait.png",
  },
];

const swipeConfidenceThreshold = 50;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

export default function TestimonialPage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [ready, setReady] = useState(false);
  const hasMultiple = testimonials.length > 1;

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2800);
    return () => window.clearTimeout(timer);
  }, []);

  function paginate(dir: number) {
    setDirection(dir);
    setActiveIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return testimonials.length - 1;
      if (next >= testimonials.length) return 0;
      return next;
    });
  }

  const t = testimonials[activeIndex];

  const carouselVariants = reduced
    ? undefined
    : {
        enter: (d: number) => ({ x: d > 0 ? 18 : -18, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? -18 : 18, opacity: 0 }),
      };

  return <MobileScreen className="f06b">
    <motion.div
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0.15 } : { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="f06b-accent" aria-hidden="true" />
      <ScreenLift contentBottom={758} maxLift={50}>
      <p className="f06b-eyebrow">GUARDANDO TUS RESPUESTAS</p>
      <h1 className="f06b-title">Estamos organizando<br />lo que nos compartiste.</h1>
      <div className="f06b-loader" aria-hidden="true">
        <motion.span className="f06b-loader-mark" animate={reduced ? undefined : { scale: [1, 1.08, 1], rotate: [0, 4, -3, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.span className="f06b-loader-emoji f06b-loader-emoji--one" animate={reduced ? undefined : { y: [0, -7, 0], rotate: [0, 8, 0] }} transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}>✨</motion.span>
        <motion.span className="f06b-loader-emoji f06b-loader-emoji--two" animate={reduced ? undefined : { y: [0, 6, 0], x: [0, 4, 0] }} transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}>💭</motion.span>
        <motion.span className="f06b-loader-emoji f06b-loader-emoji--three" animate={reduced ? undefined : { y: [0, -5, 0], rotate: [0, -7, 0] }} transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}>🌿</motion.span>
      </div>
      <div className="f06b-card-wrapper">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.article
            key={t.id}
            className="f06b-card"
            custom={direction}
            variants={carouselVariants}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : carouselVariants ? carouselVariants.exit(direction) : { opacity: 0 }}
            transition={
              reduced
                ? { duration: 0.15 }
                : { duration: 0.40, ease: [0.25, 0.1, 0.25, 1], delay: 0.06 }
            }
            drag={hasMultiple ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(_e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);
              if (swipe < -swipeConfidenceThreshold) paginate(1);
              else if (swipe > swipeConfidenceThreshold) paginate(-1);
            }}
          >
            <p className="f06b-quote" aria-hidden="true">{"\u201C"}</p>
            <div className="f06b-ring" aria-hidden="true" />
            <Image className="f06b-portrait" src={t.portrait} alt={t.name} width={59} height={59} priority />
            <p className="f06b-portrait-label">{t.name}</p>
            <blockquote>{t.quote}</blockquote>
            <p className="f06b-stars" aria-label={`${t.rating} estrellas`}>{"★".repeat(t.rating)}</p>
            <p className="f06b-attribution">Opinión publicada en {t.source}</p>
          </motion.article>
        </AnimatePresence>
      </div>
      {hasMultiple && <div className="f06b-dots" role="tablist" aria-label="Testimonios">{testimonials.map((_, i) => <button key={i} role="tab" aria-selected={i === activeIndex} aria-label={`Testimonio ${i + 1}`} className={`f06b-dot${i === activeIndex ? " f06b-dot--active" : ""}`} onClick={() => { setDirection(i > activeIndex ? 1 : -1); setActiveIndex(i); }} />)}</div>}
      <AnimatePresence mode="wait" initial={false}>
        {!ready ? <motion.div key="loading" className="f06b-loading-status" role="status" exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}><span /><span /><span /><p>Guardando tus respuestas…</p></motion.div>
          : <motion.div key="ready" className="f06b-ready" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0.15 : 0.4, ease: "easeOut" }}>
            <FlowNav backHref={routes.goals} onContinue={() => router.push(routes.orientation)} />
          </motion.div>}
      </AnimatePresence>
      </ScreenLift>
    </motion.div>
  </MobileScreen>;
}
