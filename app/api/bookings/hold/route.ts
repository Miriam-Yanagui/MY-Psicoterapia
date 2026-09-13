import { NextResponse } from "next/server";
import { createBookingRecoverySecret, setBookingSessionCookie } from "@/lib/booking-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNAVAILABLE_CODES = new Set([
  "SLOT_UNAVAILABLE",
  "SLOT_NOT_OPEN",
  "SLOT_NOT_FOUND",
  "HOLD_EXPIRED",
]);

type HoldRpcRow = {
  result_status: string;
  result_code: string | null;
  appointment_id: string | null;
  slot_id: string;
  hold_expires_at: string | null;
  replayed: boolean;
};

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
  }

  const slotId = body && typeof body === "object" && "slotId" in body
    ? (body as { slotId?: unknown }).slotId
    : null;

  if (typeof slotId !== "string" || !UUID_PATTERN.test(slotId) || !UUID_PATTERN.test(idempotencyKey)) {
    return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
  }

  try {
    const recovery = createBookingRecoverySecret();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("acquire_booking_hold", {
      p_slot_id: slotId,
      p_idempotency_key: idempotencyKey,
      p_booking_access_token_hash: recovery.hash,
    });

    if (error) throw error;

    const result = (data as HoldRpcRow[] | null)?.[0];
    if (!result) throw new Error("Missing hold result");

    if (result.result_status === "held" && result.appointment_id && result.hold_expires_at) {
      const response = NextResponse.json({
        status: "held",
        appointmentId: result.appointment_id,
        slotId: result.slot_id,
        holdExpiresAt: result.hold_expires_at,
      }, { status: result.replayed ? 200 : 201 });
      setBookingSessionCookie(response, recovery.secret);
      return response;
    }

    const code = result.result_code && UNAVAILABLE_CODES.has(result.result_code)
      ? result.result_code
      : "SLOT_UNAVAILABLE";
    return NextResponse.json({ status: "unavailable", code }, { status: 409 });
  } catch {
    return NextResponse.json({ code: "HOLD_UNAVAILABLE" }, { status: 503 });
  }
}
