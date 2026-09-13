"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Calendar } from "@/components/onboarding/Calendar";
import { TimeSlot } from "@/components/onboarding/TimeSlot";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useOnboarding } from "@/context/OnboardingProvider";
import { slotDate, slotTime, type AvailabilityResponse, type AvailabilitySlot } from "@/lib/availability";
import { createBookingHold } from "@/lib/booking";
import { scheduleCalendarFixture } from "@/lib/mockAvailability";
import { routes } from "@/lib/flow";

type HoldUiState = "idle" | "pending" | "error";

export default function SchedulePage() {
  const router = useRouter();
  const { state, dispatch } = useOnboarding();
  const date = state.appointment?.date ?? null;
  const time = state.appointment?.time ?? null;
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityState, setAvailabilityState] = useState<"loading" | "ready" | "error">("loading");
  const [holdState, setHoldState] = useState<HoldUiState>("idle");
  const [holdError, setHoldError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const pendingSlotIdRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAvailability() {
      try {
        const response = await fetch("/api/availability", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Availability request failed");
        const payload = await response.json() as AvailabilityResponse;
        setAvailability(payload.slots);
        setAvailabilityState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailability([]);
        setAvailabilityState("error");
      }
    }

    void loadAvailability();
    return () => controller.abort();
  }, []);

  const availableDates = useMemo(
    () => new Set(availability.map(slotDate)),
    [availability],
  );
  const slots = useMemo(
    () => availability.filter((slot) => slotDate(slot) === date),
    [availability, date],
  );

  const selectedSlot = useMemo(() => {
    if (!date || !time) return null;
    return (
      availability.find(
        (slot) => slotDate(slot) === date && slotTime(slot) === time,
      ) ?? null
    );
  }, [availability, date, time]);

  function resetHoldAttempt() {
    idempotencyKeyRef.current = null;
    pendingSlotIdRef.current = null;
    setHoldError(null);
    setHoldState("idle");
  }

  function selectDate(selectedDate: string) {
    if (holdState === "pending") return;
    resetHoldAttempt();
    dispatch({ type: "selectDate", date: selectedDate });
  }

  function selectTime(selectedTime: string) {
    if (holdState === "pending") return;
    resetHoldAttempt();
    dispatch({ type: "selectTime", time: selectedTime });
  }

  useEffect(() => {
    if (availabilityState !== "ready" || !time || !date) return;
    const stillExists = availability.some(
      (slot) => slotDate(slot) === date && slotTime(slot) === time,
    );
    if (!stillExists) {
      dispatch({ type: "selectTime", time: null });
    }
  }, [availability, availabilityState, date, time, dispatch]);

  const canContinue = Boolean(selectedSlot) && holdState !== "pending" && availabilityState === "ready";

  async function refreshAvailability() {
    try {
      const response = await fetch("/api/availability", { cache: "no-store" });
      if (!response.ok) throw new Error("refresh failed");
      const payload = await response.json() as AvailabilityResponse;
      setAvailability(payload.slots);
      setAvailabilityState("ready");
    } catch {
      setAvailabilityState("error");
    }
  }

  async function handleContinue() {
    if (!selectedSlot || holdState === "pending") return;

    const requestedSlotId = selectedSlot.id;
    const isSamePendingSlot = pendingSlotIdRef.current === requestedSlotId && idempotencyKeyRef.current;
    const idempotencyKey = isSamePendingSlot && idempotencyKeyRef.current
      ? idempotencyKeyRef.current
      : crypto.randomUUID();

    idempotencyKeyRef.current = idempotencyKey;
    pendingSlotIdRef.current = requestedSlotId;
    setHoldState("pending");
    setHoldError(null);

    try {
      const result = await createBookingHold({
        slotId: requestedSlotId,
        idempotencyKey,
      });

      // Si la selección cambió mientras estaba pendiente, descartar hold de slot viejo (key de A jamás para B)
      if (pendingSlotIdRef.current !== requestedSlotId) {
        setHoldState("idle");
        return;
      }

      dispatch({
        type: "setBooking",
        booking: {
          appointmentId: result.appointmentId,
          slotId: result.slotId,
          holdExpiresAt: result.holdExpiresAt,
        },
      });

      // Éxito: limpiar key de intento incierto y navegar
      idempotencyKeyRef.current = null;
      pendingSlotIdRef.current = null;
      setHoldState("idle");
      router.push(routes.checkout);
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String((error as { code: string }).code) : "HOLD_UNAVAILABLE";
      const status = error instanceof Error && "status" in error ? Number((error as { status: number }).status) : 0;

      // Definitivo: disponibilidad no válida → limpiar refs/booking, refrescar, validar selección
      if (status === 409 || code === "SLOT_UNAVAILABLE" || code === "SLOT_NOT_OPEN" || code === "SLOT_NOT_FOUND" || code === "HOLD_EXPIRED") {
        setHoldError("Ese horario ya fue tomado. Elige otro.");
        idempotencyKeyRef.current = null;
        pendingSlotIdRef.current = null;
        dispatch({ type: "clearBooking" });
        await refreshAvailability();
        // Comprobar si la selección sigue existiendo tras el refresh (usar snapshot de date/time)
        // Si no existe, limpiar selección inválida; no navegar
        // Se re-evalúa en el efecto de disponibilidad, pero forzamos por si el slot ya no está
        setHoldState("error");
        return;
      } else if (status === 0 || code === "HOLD_UNAVAILABLE") {
        // Error de red / endpoint no existe / resultado incierto: conservar key para reintento idempotente
        setHoldError("No pudimos reservar. Intenta de nuevo.");
        // Mantener idempotencyKeyRef para que el siguiente click reintente con misma key
      } else {
        setHoldError("No pudimos reservar. Intenta de nuevo.");
        idempotencyKeyRef.current = null;
        pendingSlotIdRef.current = null;
      }

      setHoldState("error");
    }
  }

  return <MobileScreen className="f09">
    <BrandMark inverse />
    <Image className="f09-watermark" src="/assets/f02-watermark.png" alt="" width={390} height={844} priority />
    <section className="f09-card" aria-labelledby="schedule-title">
      <p className="f09-eyebrow">AGENDA TU SESIÓN</p>
      <h1 id="schedule-title">Elige un momento<br />para ti</h1>
      <p className="f09-meet"><span>Tu sesión será por</span><Image src="/assets/google-meet-lockup.svg" alt="Google Meet" width={93} height={15} /></p>
      <Calendar availableDates={availableDates} selectedDate={date} onSelectDate={selectDate} />
      <p className="f09-slots-label">HORARIOS DISPONIBLES</p>
      <div className="time-slots">{slots.map((slot) => {
        const displayTime = slotTime(slot);
        return <TimeSlot key={slot.id} time={displayTime} selected={time === displayTime} onSelect={() => selectTime(displayTime)} />;
      })}</div>
      <p className="f09-timezone">{scheduleCalendarFixture.timezoneLabel}</p>
      <PrimaryButton disabled={!canContinue} onClick={() => void handleContinue()}>
        {holdState === "pending" ? "Reservando…" : "Continuar"}
      </PrimaryButton>
      {holdError && <p className="f09-error" role="alert" style={{ position: "absolute", left: 25, top: 620, width: 278, margin: 0, color: "#a62d19", fontSize: 9, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>{holdError}</p>}
      <p className="f09-note">{availabilityState === "loading" ? "Consultando disponibilidad…" : availabilityState === "error" ? "No pudimos cargar los horarios · Intenta de nuevo" : holdState === "pending" ? "Reservando tu horario…" : "Disponibilidad actualizada desde la agenda"}</p>
    </section>
  </MobileScreen>;
}
