"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AppointmentSummary } from "@/components/checkout/AppointmentSummary";
import { ConsentField } from "@/components/checkout/ConsentField";
import { ContactDetails } from "@/components/checkout/ContactDetails";
import { PaymentSection } from "@/components/checkout/PaymentSection";
import { useOnboarding } from "@/context/OnboardingProvider";

type CheckoutStep = "details" | "payment";

export default function CheckoutPage() {
  const { state, dispatch } = useOnboarding();
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("details");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contact.email.trim());
  const phoneValid = state.contact.phone.replace(/\D/g, "").length >= 7;
  const contactValid = useMemo(() => emailValid && Boolean(state.contact.countryCode) && phoneValid && state.contact.consent, [emailValid, phoneValid, state.contact.countryCode, state.contact.consent]);
  const date = state.appointment?.date ?? null;
  const time = state.appointment?.time ?? null;

  return <div className={`checkout-stage checkout-stage--${checkoutStep}`}><main className={`checkout checkout--${checkoutStep}`}>
    <Image className="checkout-watermark" src="/assets/f04-watermark-on-cream.png" alt="" width={390} height={844} priority />
    <div className="checkout-card" />
    <p className="checkout-eyebrow">DETALLES DE TU CITA</p><h1>¿Dónde te enviamos<br />los detalles?</h1><p className="checkout-intro">Ingresa tus datos para recibirlos.</p>
    <ContactDetails contact={state.contact} dispatch={dispatch} />
    {checkoutStep === "payment" && <p className="checkout-timer">Tu horario está reservado durante 5 minutos.</p>}
    <AppointmentSummary date={date} time={time} />
    <ConsentField checked={state.contact.consent} onChange={(consent) => dispatch({ type: "setContactConsent", consent })} />
    <button className="checkout-continue" type="button" disabled={!contactValid} onClick={() => setCheckoutStep("payment")}>Continuar al pago</button>
    <Image className="checkout-continue-arrow" src="/assets/f02-arrow-right.png" alt="" width={18} height={18} />
    <p className="checkout-privacy">Solo usaremos estos datos para tu cita.</p>
    {checkoutStep === "payment" && <PaymentSection />}
  </main></div>;
}
