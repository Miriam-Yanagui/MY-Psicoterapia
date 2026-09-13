"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppointmentSummary } from "@/components/checkout/AppointmentSummary";
import { ConsentField } from "@/components/checkout/ConsentField";
import { ContactDetails } from "@/components/checkout/ContactDetails";
import { PaymentSection } from "@/components/checkout/PaymentSection";
import { useOnboarding } from "@/context/OnboardingProvider";
import { routes } from "@/lib/flow";

type CheckoutStep = "details" | "payment";

function formatCountdown(remainingMs: number): string {
  if (remainingMs <= 0) return "00:00";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { state, dispatch } = useOnboarding();
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("details");
  const booking = state.booking;
  const [now, setNow] = useState<number | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contact.email.trim());
  const phoneValid = state.contact.phone.replace(/\D/g, "").length >= 7;
  const contactValid = useMemo(() => emailValid && Boolean(state.contact.countryCode) && phoneValid && state.contact.consent, [emailValid, phoneValid, state.contact.countryCode, state.contact.consent]);
  const date = state.appointment?.date ?? null;
  const time = state.appointment?.time ?? null;

  const remainingMs = useMemo(() => {
    if (!booking) return 0;
    if (now === null) return null;
    return new Date(booking.holdExpiresAt).getTime() - now;
  }, [booking, now]);
  const isExpired = Boolean(booking) && remainingMs !== null && remainingMs <= 0;
  const countdown = useMemo(() => formatCountdown(remainingMs ?? 0), [remainingMs]);

  useEffect(() => {
    if (!booking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking]);

  // Sin booking → redirigir a F09 (no por contacto vacío, solo por falta de hold)
  useEffect(() => {
    if (!booking) {
      router.replace(routes.schedule);
    }
  }, [booking, router]);

  if (!booking) {
    return <div className="checkout-stage"><main className="checkout"><p className="checkout-redirect">Redirigiendo a agenda…</p></main></div>;
  }

  return <div className={`checkout-stage checkout-stage--${checkoutStep}`}><main className={`checkout checkout--${checkoutStep}`}>
    <Image className="checkout-watermark" src="/assets/f04-watermark-on-cream.png" alt="" width={390} height={844} priority />
    <div className="checkout-card" />
    <p className="checkout-eyebrow">DETALLES DE TU CITA</p><h1>¿Dónde te enviamos<br />los detalles?</h1><p className="checkout-intro">{isExpired ? "Tu reserva expiró. Elige otro horario para continuar." : "Ingresa tus datos para recibirlos."}</p>
    <ContactDetails contact={state.contact} dispatch={dispatch} />
    {checkoutStep === "payment" && !isExpired && <p className="checkout-timer">Tu horario está reservado durante {countdown}.</p>}
    {checkoutStep === "payment" && isExpired && <p className="checkout-timer checkout-timer--expired">Tu reserva expiró · 00:00</p>}
    <AppointmentSummary date={date} time={time} />
    <ConsentField checked={state.contact.consent} onChange={(consent) => dispatch({ type: "setContactConsent", consent })} />
    <button className="checkout-continue" type="button" disabled={!isExpired && !contactValid} onClick={() => { if (isExpired) { dispatch({ type: "clearBooking" }); router.push(routes.schedule); } else { setCheckoutStep("payment"); } }}>{isExpired ? "Elegir otro horario" : "Continuar al pago"}</button>
    <Image className="checkout-continue-arrow" src="/assets/f02-arrow-right.png" alt="" width={18} height={18} />
    <p className="checkout-privacy">Solo usaremos estos datos para tu cita.</p>
    {checkoutStep === "payment" && !isExpired && <PaymentSection />}
  </main></div>;
}
