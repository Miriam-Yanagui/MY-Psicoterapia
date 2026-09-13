"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Calendar } from "@/components/onboarding/Calendar";
import { TimeSlot } from "@/components/onboarding/TimeSlot";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useOnboarding } from "@/context/OnboardingProvider";
import { slotDate, slotTime, type AvailabilityResponse, type AvailabilitySlot } from "@/lib/availability";
import { scheduleCalendarFixture } from "@/lib/mockAvailability";
import { routes } from "@/lib/flow";

export default function SchedulePage() {
  const router = useRouter();
  const { state, dispatch } = useOnboarding();
  const date = state.appointment?.date ?? null;
  const time = state.appointment?.time ?? null;
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityState, setAvailabilityState] = useState<"loading" | "ready" | "error">("loading");

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

  useEffect(() => {
    if (availabilityState !== "ready" || !time) return;
    if (!slots.some((slot) => slotTime(slot) === time)) {
      dispatch({ type: "selectTime", time: null });
    }
  }, [availabilityState, dispatch, slots, time]);

  return <MobileScreen className="f09">
    <BrandMark inverse />
    <Image className="f09-watermark" src="/assets/f02-watermark.png" alt="" width={390} height={844} priority />
    <section className="f09-card" aria-labelledby="schedule-title">
      <p className="f09-eyebrow">AGENDA TU SESIÓN</p>
      <h1 id="schedule-title">Elige un momento<br />para ti</h1>
      <p className="f09-meet"><span>Tu sesión será por</span><Image src="/assets/google-meet-lockup.svg" alt="Google Meet" width={93} height={15} /></p>
      <Calendar availableDates={availableDates} selectedDate={date} onSelectDate={(selectedDate) => dispatch({ type: "selectDate", date: selectedDate })} />
      <p className="f09-slots-label">HORARIOS DISPONIBLES</p>
      <div className="time-slots">{slots.map((slot) => {
        const displayTime = slotTime(slot);
        return <TimeSlot key={slot.id} time={displayTime} selected={time === displayTime} onSelect={() => dispatch({ type: "selectTime", time: displayTime })} />;
      })}</div>
      <p className="f09-timezone">{scheduleCalendarFixture.timezoneLabel}</p>
      <PrimaryButton disabled={!date || !time} onClick={() => router.push(routes.checkout)}>Continuar</PrimaryButton>
      <p className="f09-note">{availabilityState === "loading" ? "Consultando disponibilidad…" : availabilityState === "error" ? "No pudimos cargar los horarios · Intenta de nuevo" : "Disponibilidad actualizada desde la agenda"}</p>
    </section>
  </MobileScreen>;
}
