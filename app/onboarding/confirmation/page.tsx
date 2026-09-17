"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CelebrationMoment } from "@/components/ui/CelebrationMoment";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { useReducedMotion } from "@/lib/motion";
import { recoverCurrentBooking, isTemporaryBookingFailure } from "@/lib/booking";
import type { CurrentBooking } from "@/lib/booking";
import { routes } from "@/lib/flow";
import { isAuthoritativelyConfirmed } from "@/lib/confirmation";

const MIRIAM_WHATSAPP = "5216243167794";
const WHATSAPP_MESSAGE = "Hola Miriam, acabo de agendar mi sesión y todavía tengo una duda.";
const WHATSAPP_WEB_URL = `https://wa.me/${MIRIAM_WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

function openWhatsAppMessenger(event: React.MouseEvent<HTMLAnchorElement>) {
  if (!/Android/i.test(navigator.userAgent)) return;
  event.preventDefault();
  const fallback = encodeURIComponent(WHATSAPP_WEB_URL);
  window.location.href = `intent://send?phone=${MIRIAM_WHATSAPP}&text=${encodeURIComponent(WHATSAPP_MESSAGE)}#Intent;scheme=whatsapp;package=com.whatsapp;S.browser_fallback_url=${fallback};end`;
}

export default function ConfirmationPage() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState<CurrentBooking | null>(null);
  useEffect(() => {
    let active = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    function poll() {
      recoverCurrentBooking()
        .then((booking) => {
          if (!active) return;
          if (isAuthoritativelyConfirmed(booking)) { setBooking(booking); setConfirmed(true); return; }
          if (!booking) { router.replace(routes.schedule); return; }
          router.replace(routes.checkout);
        })
        .catch((error) => {
          if (!active) return;
          if (isTemporaryBookingFailure(error)) {
            pollTimer = setTimeout(poll, 3000);
            return;
          }
          router.replace(routes.checkout);
        });
    }

    poll();
    return () => { active = false; if (pollTimer) clearTimeout(pollTimer); };
  }, [router]);
  return <MobileScreen className="f12">
    <motion.div
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0.15 } : { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
    >
    <div className="cream-watermark" aria-hidden="true" />
    <section className="f12-card"><p className="f12-eyebrow">{confirmed ? "CITA CONFIRMADA" : "VERIFICANDO CITA"}</p>
      {confirmed ? <CelebrationMoment reduced={reduced} /> : <motion.div
        className="f12-check"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0.15 : 0.38 }}
      >…</motion.div>}
      <h1>{confirmed ? "Tu espacio está reservado." : "Verificando tu cita…"}</h1>
      <p className="f12-description">{confirmed ? "Recibimos tu pago y confirmamos tu sesión con Miriam." : "Espera un momento mientras comprobamos la confirmación."}</p>
      {confirmed && booking && <>
        <div className="f12-summary" aria-label="Resumen de tu cita">
          <p className="f12-summary-label">RESUMEN</p>
          <p className="f12-summary-date">{new Intl.DateTimeFormat("es-MX", { timeZone: booking.slot.timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date(booking.slot.startsAt))}</p>
          <p className="f12-summary-meta">{new Intl.DateTimeFormat("es-MX", { timeZone: booking.slot.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(booking.slot.startsAt))} · Google Meet</p>
          <p className="f12-summary-payment">Pago confirmado · ${(booking.amountMinor / 100).toFixed(0)} {booking.currency}</p>
        </div>
        <div className="f12-next">
          <h2>¿Qué sigue?</h2>
          <ol>
            <li>Guarda esta confirmación.</li>
            <li>Miriam usará <strong>{booking.contact?.email ?? "tu correo registrado"}</strong> para compartir los detalles de acceso.</li>
            <li>Conéctate a Google Meet cinco minutos antes.</li>
          </ol>
        </div>
        <div className="f12-whatsapp-help">
          <p>Si aún tienes dudas, puedes dejarle un mensaje a la psicóloga Miriam. Te responderá en cuanto esté disponible.</p>
          <a
            className="f12-whatsapp-button"
            href={WHATSAPP_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openWhatsAppMessenger}
          >
            <span aria-hidden="true">💬</span>
            Hablar con Miriam
          </a>
        </div>
      </>}
    </section>
    </motion.div>
  </MobileScreen>;
}
