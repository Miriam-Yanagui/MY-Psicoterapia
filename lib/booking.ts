import type { BookingHold } from "@/lib/types";
import { slotDate, slotTime } from "@/lib/availability";

export type HoldSuccess = {
  status: "held";
  appointmentId: string;
  slotId: string;
  holdExpiresAt: string;
};

export type HoldUnavailable = {
  status: "unavailable";
  code: "SLOT_UNAVAILABLE" | "SLOT_NOT_OPEN" | "SLOT_NOT_FOUND" | "HOLD_EXPIRED";
};

export type HoldResult = HoldSuccess | HoldUnavailable;

export type HoldError = {
  error: string;
  code?: string;
  status?: number;
};

export type CurrentBooking = {
  appointmentId: string;
  status: "held" | "payment_pending" | "confirmed";
  holdExpiresAt: string | null;
  slot: { id: string; startsAt: string; endsAt: string; timezone: string };
  contact: { email: string; countryCode: string; phone: string; consented: boolean } | null;
};

export function toBookingHold(result: HoldSuccess): BookingHold {
  return {
    appointmentId: result.appointmentId,
    slotId: result.slotId,
    holdExpiresAt: result.holdExpiresAt,
  };
}

export async function createBookingHold(params: {
  slotId: string;
  idempotencyKey: string;
}): Promise<HoldSuccess> {
  const response = await fetch("/api/bookings/hold", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({ slotId: params.slotId }),
  });

  const payload = (await response.json().catch(() => null)) as
    | HoldSuccess
    | HoldUnavailable
    | HoldError
    | null;

  if (response.ok && payload && (payload as HoldSuccess).status === "held") {
    return payload as HoldSuccess;
  }

  if (response.status === 409 && payload && (payload as HoldUnavailable).status === "unavailable") {
    const unavailable = payload as HoldUnavailable;
    throw Object.assign(new Error(unavailable.code), {
      code: unavailable.code,
      status: 409 as const,
    });
  }

  if (response.status === 409) {
    throw Object.assign(new Error("SLOT_UNAVAILABLE"), { code: "SLOT_UNAVAILABLE", status: 409 as const });
  }

  const errorCode =
    payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string"
      ? payload.code
      : payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "HOLD_UNAVAILABLE";

  throw Object.assign(new Error(errorCode), {
    code: errorCode,
    status: response.status,
  });
}

export async function recoverCurrentBooking(): Promise<CurrentBooking | null> {
  const response = await fetch("/api/bookings/current", { cache: "no-store" });
  if (response.status === 401 || response.status === 404) return null;
  if (!response.ok) throw new Error("BOOKING_RECOVERY_UNAVAILABLE");
  return await response.json() as CurrentBooking;
}

export function recoveredBookingState(current: CurrentBooking) {
  return {
    booking: {
      appointmentId: current.appointmentId,
      slotId: current.slot.id,
      holdExpiresAt: current.holdExpiresAt ?? new Date(0).toISOString(),
      status: current.status,
    },
    appointment: {
      date: slotDate(current.slot),
      time: slotTime(current.slot),
    },
    contact: current.contact
      ? {
          email: current.contact.email,
          countryCode: current.contact.countryCode,
          phone: current.contact.phone,
          consent: current.contact.consented,
        }
      : null,
  };
}

export async function saveBookingContact(contact: {
  email: string;
  countryCode: string;
  phone: string;
  consented: boolean;
}): Promise<void> {
  const response = await fetch("/api/bookings/contact", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (response.ok) return;

  const payload = await response.json().catch(() => null) as { code?: string } | null;
  throw Object.assign(new Error(payload?.code ?? "CONTACT_UNAVAILABLE"), {
    code: payload?.code ?? "CONTACT_UNAVAILABLE",
    status: response.status,
  });
}
