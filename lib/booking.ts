import type { BookingHold } from "@/lib/types";

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
