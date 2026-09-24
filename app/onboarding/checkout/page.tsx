"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppointmentSummary } from "@/components/checkout/AppointmentSummary";
import { ConsentField } from "@/components/checkout/ConsentField";
import { PaymentSection } from "@/components/checkout/PaymentSection";
import { useOnboarding } from "@/context/OnboardingProvider";
import { recoverCurrentBooking, recoveredBookingState, saveBookingContact, isTemporaryBookingFailure } from "@/lib/booking";
import { saveBookingIntake } from "@/lib/intake";
import { trackFunnelEvent } from "@/lib/funnel-analytics";
import { routes } from "@/lib/flow";
import { isAuthoritativelyConfirmed } from "@/lib/confirmation";
import { useReducedMotion } from "@/lib/motion";

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
  const reduced = useReducedMotion();
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("details");
  const [contactState, setContactState] = useState<"idle" | "saving" | "error">("idle");
  const [contactError, setContactError] = useState<string | null>(null);
  const booking = state.booking;
  const [now, setNow] = useState<number | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<{ amountMinor: number; currency: "MXN"; status?: "processing" | "pending" | "approved_provisional" | "approved" | "rejected" } | null>(null);
  const paymentSectionRef = useRef<HTMLElement>(null);
  const paymentScrollRequested = useRef(false);
  const checkoutStageRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const scrollDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealStartedRef = useRef(false);

  const contactValid = state.contact.consent && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contact.email.trim())
    && /^\+[1-9]\d{0,3}$/.test(state.contact.countryCode.trim()) && /^\d{7,14}$/.test(state.contact.phone.replace(/\D/g, ""));
  const date = state.appointment?.date ?? null;
  const time = state.appointment?.time ?? null;

  const remainingMs = useMemo(() => {
    if (!booking || booking.status === "confirmed") return 0;
    if (now === null) return null;
    return new Date(booking.holdExpiresAt).getTime() - now;
  }, [booking, now]);
  const isExpired = Boolean(booking && booking.status === "held") && remainingMs !== null && remainingMs <= 0;
  const countdown = useMemo(() => formatCountdown(remainingMs ?? 0), [remainingMs]);

  useEffect(() => {
    if (booking || state.bookingRecoveryState === "unavailable") return;
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;

    function attempt() {
      if (inFlight) return;
      inFlight = true;
      recoverCurrentBooking()
        .then((current) => {
          if (!active) return;
          if (!current) {
            dispatch({ type: "setBookingRecoveryState", state: "unavailable" });
            router.replace(routes.schedule);
            return;
          }
          dispatch({ type: "restoreBooking", ...recoveredBookingState(current) });
          if (!current.intake) {
            router.replace(routes.name);
            return;
          }
          if (isAuthoritativelyConfirmed(current)) {
            router.replace(routes.confirmation);
            return;
          }
          setPaymentConfig({ amountMinor: current.amountMinor, currency: current.currency, status: current.payment?.status });
          if (current.consented && current.intake && current.contact?.phone && current.contact?.countryCode
              && (current.status === "held" || current.status === "payment_pending")) setCheckoutStep("payment");
        })
        .catch((error) => {
          if (!active) return;
          if (isTemporaryBookingFailure(error)) {
            inFlight = false;
            retryTimer = setTimeout(attempt, 3000);
            return;
          }
          dispatch({ type: "setBookingRecoveryState", state: "unavailable" });
          router.replace(routes.schedule);
        });
    }

    dispatch({ type: "setBookingRecoveryState", state: "recovering" });
    attempt();
    return () => { active = false; if (retryTimer) clearTimeout(retryTimer); };
  }, [booking, dispatch, router, state.bookingRecoveryState]);

  useEffect(() => {
    if (!booking || checkoutStep !== "payment") return;
    let active = true;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    function poll() {
      recoverCurrentBooking()
        .then((current) => {
          if (!active) return;
          if (!current) {
            dispatch({ type: "clearBooking" });
            router.replace(routes.schedule);
            return;
          }
          if (isAuthoritativelyConfirmed(current)) {
            dispatch({ type: "restoreBooking", ...recoveredBookingState(current) });
            router.replace(routes.confirmation);
            return;
          }
          setPaymentConfig({ amountMinor: current.amountMinor, currency: current.currency, status: current.payment?.status });
          pollTimer = setTimeout(poll, 3000);
        })
        .catch((error) => {
          if (!active) return;
          if (isTemporaryBookingFailure(error)) {
            pollTimer = setTimeout(poll, 3000);
            return;
          }
          dispatch({ type: "clearBooking" });
          router.replace(routes.schedule);
        });
    }

    void poll();
    return () => { active = false; if (pollTimer) clearTimeout(pollTimer); };
  }, [booking, checkoutStep, dispatch, router]);

  useEffect(() => {
    if (!booking || booking.status === "confirmed") return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [booking]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    if (scrollDelayRef.current !== null) clearTimeout(scrollDelayRef.current);
  }, []);

  useEffect(() => {
    const stage = checkoutStageRef.current;
    if (!stage || !booking || checkoutStep !== "details" || reduced || revealStartedRef.current) return;
    revealStartedRef.current = true;
    let frame: number | null = null;
    let cancelled = false;
    const cancel = () => { cancelled = true; if (frame !== null) cancelAnimationFrame(frame); };
    const events: Array<keyof HTMLElementEventMap> = ["wheel", "touchstart", "pointerdown", "keydown"];
    events.forEach((event) => stage.addEventListener(event, cancel, { once: true, passive: true }));
    const timer = window.setTimeout(() => {
      const start = stage.scrollTop;
      const destination = Math.max(0, stage.scrollHeight - stage.clientHeight);
      const distance = destination - start;
      const duration = 2800;
      const startedAt = performance.now();
      function reveal(timestamp: number) {
        if (cancelled) return;
        const progress = Math.min(1, (timestamp - startedAt) / duration);
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        stage!.scrollTop = start + distance * eased;
        if (progress < 1) frame = requestAnimationFrame(reveal);
      }
      if (distance > 8) frame = requestAnimationFrame(reveal);
    }, 900);
    return () => {
      window.clearTimeout(timer);
      cancel();
      events.forEach((event) => stage.removeEventListener(event, cancel));
    };
  }, [booking, checkoutStep, reduced]);

  const handleBrickReady = useCallback(() => {
    if (!paymentScrollRequested.current) return;
    paymentScrollRequested.current = false;
    scrollDelayRef.current = setTimeout(() => {
      const stage = checkoutStageRef.current;
      const paymentSection = paymentSectionRef.current;
      if (!stage || !paymentSection) return;

      const stageTop = stage.getBoundingClientRect().top;
      const targetTop = paymentSection.getBoundingClientRect().top - stageTop + stage.scrollTop - 16;
      if (reduced) {
        stage.scrollTop = targetTop;
        return;
      }

      const startTop = stage.scrollTop;
      const distance = targetTop - startTop;
      const duration = 900;
      const startedAt = performance.now();

      function animateScroll(timestamp: number) {
        const progress = Math.min(1, (timestamp - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        stage!.scrollTop = startTop + distance * eased;
        if (progress < 1) scrollFrameRef.current = requestAnimationFrame(animateScroll);
        else scrollFrameRef.current = null;
      }

      scrollFrameRef.current = requestAnimationFrame(animateScroll);
    }, 220);
  }, [reduced]);

  async function handleContinue() {
    if (isExpired) {
      dispatch({ type: "clearBooking" });
      router.push(routes.schedule);
      return;
    }
    if (!contactValid || contactState === "saving") return;

    setContactState("saving");
    setContactError(null);
    try {
      await saveBookingIntake({ name: state.name, emotion: state.emotion!, therapyExperience: state.therapyExperience!,
        goals: state.goals, goalsAdditionalNotes: state.goalsAdditionalNotes });
      await saveBookingContact({ email: state.contact.email, countryCode: state.contact.countryCode,
        phone: state.contact.phone, consented: state.contact.consent });
      trackFunnelEvent("contact_saved");
      const current = await recoverCurrentBooking();
      if (!current) throw Object.assign(new Error("BOOKING_NOT_FOUND"), { code: "BOOKING_NOT_FOUND" });
      setPaymentConfig({ amountMinor: current.amountMinor, currency: current.currency, status: current.payment?.status });
      paymentScrollRequested.current = true;
      setCheckoutStep("payment");
      setContactState("idle");
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String((error as { code: string }).code) : "CONTACT_UNAVAILABLE";
      if (code === "HOLD_EXPIRED" || code === "BOOKING_NOT_ACTIVE" || code === "BOOKING_NOT_FOUND") {
        dispatch({ type: "clearBooking" });
        setContactError("Tu reserva expiró. Elige otro horario para continuar.");
        router.replace(routes.schedule);
      } else {
        setContactError("No pudimos guardar tus datos. Intenta de nuevo.");
      }
      setContactState("error");
    }
  }

  if (!booking) {
    const message = state.bookingRecoveryState === "unavailable"
      ? "No encontramos una reserva vigente. Volviendo a agenda…"
      : "Recuperando tu reserva…";
    return <div className="checkout-stage"><main className="checkout"><p className="checkout-redirect">{message}</p></main></div>;
  }

  return <div ref={checkoutStageRef} className={`checkout-stage checkout-stage--${checkoutStep}`}><main className={`checkout checkout--${checkoutStep}`}>
    <div className="checkout-orange-pattern" aria-hidden="true" />
    <p className={`checkout-timer${isExpired ? " checkout-timer--expired" : ""}`}><span>{isExpired ? "Tu reserva expiró · 00:00" : <>Tu horario está reservado durante <strong>{countdown}</strong>.</>}</span></p>
    <AppointmentSummary date={date} time={time} appointmentId={booking.appointmentId} amountMinor={booking.amountMinor} currency={booking.currency} />
    {checkoutStep === "details" && <div className="checkout-contact-fields">
      <label>Correo electrónico<input type="email" autoComplete="email" value={state.contact.email} onChange={(event) => dispatch({ type: "setContactEmail", email: event.target.value })} /></label>
      <label>Código de país<input type="tel" autoComplete="tel-country-code" value={state.contact.countryCode} onChange={(event) => dispatch({ type: "setContactCountryCode", countryCode: event.target.value })} /></label>
      <label>Teléfono<input type="tel" autoComplete="tel-national" value={state.contact.phone} onChange={(event) => dispatch({ type: "setContactPhone", phone: event.target.value })} /></label>
    </div>}
    <ConsentField checked={state.contact.consent} onChange={(consent) => dispatch({ type: "setContactConsent", consent })} />
    <button className="checkout-continue" type="button" disabled={!isExpired && (!contactValid || contactState === "saving")} onClick={() => void handleContinue()}>{isExpired ? "Elegir otro horario" : contactState === "saving" ? "Guardando…" : "Continuar al pago"}</button>
    <Image className="checkout-continue-arrow" src="/assets/f02-arrow-right.png" alt="" width={18} height={18} />
    {contactError && <p className="checkout-privacy" role="alert">{contactError}</p>}
    {!contactError && <p className="checkout-privacy">Usa este mismo correo en el formulario de pago seguro.</p>}
    {checkoutStep === "payment" && !isExpired && paymentConfig && <PaymentSection {...paymentConfig} sectionRef={paymentSectionRef} onBrickReady={handleBrickReady} onBookingUnavailable={() => { dispatch({ type: "clearBooking" }); router.replace(routes.schedule); }} />}
  </main></div>;
}
