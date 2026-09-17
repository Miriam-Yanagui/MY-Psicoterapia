"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Calendar } from "@/components/onboarding/Calendar";
import { TimeSlot } from "@/components/onboarding/TimeSlot";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { FlowNav } from "@/components/ui/FlowNav";
import { ScreenLift } from "@/components/ui/ScreenLift";
import { useOnboarding } from "@/context/OnboardingProvider";
import { useReducedMotion } from "@/lib/motion";
import { getMonthBoundaries } from "@/lib/calendar";
import { slotDate, slotTime, type AvailabilityResponse, type AvailabilitySlot } from "@/lib/availability";
import { createBookingHold } from "@/lib/booking";
import { scheduleCalendarFixture } from "@/lib/mockAvailability";
import { routes } from "@/lib/flow";

type HoldUiState = "idle" | "pending" | "error";

function getCurrentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function addMonths(year: number, month: number, delta: number) {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: total % 12 };
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function waitForRetry(signal: AbortSignal, delayMs: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, delayMs);
    signal.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export default function SchedulePage() {
  const router = useRouter();
  const { state, dispatch } = useOnboarding();
  const reduced = useReducedMotion();
  const date = state.appointment?.date ?? null;
  const time = state.appointment?.time ?? null;

  const [visibleMonth, setVisibleMonth] = useState(getCurrentMonth);
  const [availability, setAvailability] = useState<{ slots: AvailabilitySlot[]; status: "loading" | "ready" | "error" }>({ slots: [], status: "loading" });
  const [holdState, setHoldState] = useState<HoldUiState>("idle");
  const [holdError, setHoldError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const pendingSlotIdRef = useRef<string | null>(null);

  const cacheRef = useRef<Map<string, AvailabilitySlot[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const currentMonth = useMemo(getCurrentMonth, []);
  const minMonth = currentMonth;
  const maxMonth = useMemo(() => addMonths(currentMonth.year, currentMonth.month, 2), [currentMonth]);

  const canGoPrevious = !(visibleMonth.year === minMonth.year && visibleMonth.month === minMonth.month);
  const canGoNext = !(visibleMonth.year === maxMonth.year && visibleMonth.month === maxMonth.month);

  const fetchMonth = useCallback(async (year: number, month: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const key = monthKey(year, month);
    const cached = cacheRef.current.get(key);
    if (cached) {
      setAvailability({ slots: cached, status: "ready" });
      return;
    }

    setAvailability((prev) => ({ ...prev, status: "loading" }));
    const { from, to } = getMonthBoundaries(year, month);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch(`/api/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Availability request failed");
        const payload = await response.json() as AvailabilityResponse;
        cacheRef.current.set(key, payload.slots);
        setAvailability({ slots: payload.slots, status: "ready" });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (attempt < 2) {
          try {
            await waitForRetry(controller.signal, 1500);
          } catch {
            return;
          }
          continue;
        }
        setAvailability({ slots: [], status: "error" });
      }
    }
  }, []);

  useEffect(() => {
    void fetchMonth(visibleMonth.year, visibleMonth.month);
    return () => { abortRef.current?.abort(); };
  }, [visibleMonth, fetchMonth]);

  const availableDates = useMemo(
    () => new Set(availability.slots.map(slotDate)),
    [availability.slots],
  );
  const slots = useMemo(
    () => availability.slots.filter((slot) => slotDate(slot) === date),
    [availability.slots, date],
  );

  const selectedSlot = useMemo(() => {
    if (!date || !time) return null;
    return (
      availability.slots.find(
        (slot) => slotDate(slot) === date && slotTime(slot) === time,
      ) ?? null
    );
  }, [availability.slots, date, time]);

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
    if (availability.slots.length === 0 || !date || !time) return;
    const selectedDateIsInVisibleMonth = date.slice(0, 7) === monthKey(visibleMonth.year, visibleMonth.month);
    if (!selectedDateIsInVisibleMonth) return;
    const stillExists = availability.slots.some(
      (slot) => slotDate(slot) === date && slotTime(slot) === time,
    );
    if (!stillExists) {
      dispatch({ type: "selectTime", time: null });
    }
  }, [availability.slots, date, time, dispatch, visibleMonth]);

  const canContinue = Boolean(selectedSlot) && holdState !== "pending" && availability.status === "ready";

  async function refreshAvailability() {
    const { from, to } = getMonthBoundaries(visibleMonth.year, visibleMonth.month);
    try {
      const response = await fetch(`/api/availability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("refresh failed");
      const payload = await response.json() as AvailabilityResponse;
      cacheRef.current.set(monthKey(visibleMonth.year, visibleMonth.month), payload.slots);
      setAvailability({ slots: payload.slots, status: "ready" });
    } catch {
      setAvailability((prev) => ({ ...prev, status: "error" }));
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

      idempotencyKeyRef.current = null;
      pendingSlotIdRef.current = null;
      setHoldState("idle");
      router.push(routes.checkout);
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String((error as { code: string }).code) : "HOLD_UNAVAILABLE";
      const status = error instanceof Error && "status" in error ? Number((error as { status: number }).status) : 0;

      if (status === 409 || code === "SLOT_UNAVAILABLE" || code === "SLOT_NOT_OPEN" || code === "SLOT_NOT_FOUND" || code === "HOLD_EXPIRED") {
        setHoldError("Ese horario ya fue tomado. Elige otro.");
        idempotencyKeyRef.current = null;
        pendingSlotIdRef.current = null;
        dispatch({ type: "clearBooking" });
        await refreshAvailability();
        setHoldState("error");
        return;
      } else if (status === 0 || code === "HOLD_UNAVAILABLE") {
        setHoldError("No pudimos reservar. Intenta de nuevo.");
      } else {
        setHoldError("No pudimos reservar. Intenta de nuevo.");
        idempotencyKeyRef.current = null;
        pendingSlotIdRef.current = null;
      }

      setHoldState("error");
    }
  }

  const hasNoAvailability = availability.status === "ready" && availableDates.size === 0;

  return <MobileScreen className="f09">
    <motion.div
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={reduced ? { duration: 0.15 } : { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
    >
    <Image className="f09-watermark" src="/assets/f02-watermark.png" alt="" width={390} height={844} priority />
    <ScreenLift contentBottom={772} maxLift={60}>
    <section className="f09-card" aria-labelledby="schedule-title">
      <p className="f09-eyebrow">AGENDA TU SESIÓN</p>
      <h1 id="schedule-title">Elige un momento<br />para ti</h1>
      <p className="f09-meet"><span>Tu sesión será por</span><Image src="/assets/google-meet-lockup.svg" alt="Google Meet" width={93} height={15} /></p>
      <Calendar
        year={visibleMonth.year}
        month={visibleMonth.month}
        availableDates={availableDates}
        selectedDate={date}
        onSelectDate={selectDate}
        onPreviousMonth={() => setVisibleMonth((v) => addMonths(v.year, v.month, -1))}
        onNextMonth={() => setVisibleMonth((v) => addMonths(v.year, v.month, 1))}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
      />
      {hasNoAvailability && <p className="f09-no-slots" style={{ textAlign: "center", fontSize: 11, color: "var(--color-support)", margin: "8px 0 0" }}>No hay horarios disponibles este mes.</p>}
      <p className="f09-slots-label">HORARIOS DISPONIBLES</p>
      <div className="time-slots">{slots.map((slot) => {
        const displayTime = slotTime(slot);
        return <TimeSlot key={slot.id} time={displayTime} selected={time === displayTime} onSelect={() => selectTime(displayTime)} />;
      })}</div>
      <p className="f09-timezone">{scheduleCalendarFixture.timezoneLabel}</p>
      <FlowNav
        backHref={routes.miriam}
        continueLabel={holdState === "pending" ? "Reservando…" : "Continuar"}
        disabled={!canContinue}
        onContinue={() => void handleContinue()}
      />
      {holdError && <p className="f09-error" role="alert" style={{ position: "absolute", left: 25, top: 620, width: 278, margin: 0, color: "#a62d19", fontSize: 9, fontWeight: 700, lineHeight: 1.2, textAlign: "center" }}>{holdError}</p>}
      {!holdError && <p className="f09-note">{availability.status === "loading" ? "Consultando disponibilidad…" : availability.status === "error" ? "No pudimos cargar los horarios · Intenta de nuevo" : holdState === "pending" ? "Reservando tu horario…" : "Disponibilidad actualizada desde la agenda"}</p>}
    </section>
    </ScreenLift>
    </motion.div>
  </MobileScreen>;
}
