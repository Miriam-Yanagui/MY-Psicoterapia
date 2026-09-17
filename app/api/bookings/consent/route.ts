import { NextRequest, NextResponse } from "next/server";
import {
  BOOKING_SESSION_COOKIE,
  clearBookingSessionCookie,
  hasAllowedOrigin,
  hashBookingRecoverySecret,
} from "@/lib/booking-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const CONSENT_VERSION = "booking-privacy-2026-09-17";

type ConsentRpcRow = {
  result_status: string;
  result_code: string | null;
  hold_expires_at: string | null;
};

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) return NextResponse.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  const secret = request.cookies.get(BOOKING_SESSION_COOKIE)?.value;
  if (!secret) return NextResponse.json({ code: "BOOKING_NOT_FOUND" }, { status: 401 });

  const body = await request.json().catch(() => null) as { consented?: boolean } | null;
  if (body?.consented !== true) return NextResponse.json({ code: "CONSENT_REQUIRED" }, { status: 400 });

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("save_booking_consent", {
      p_booking_access_token_hash: hashBookingRecoverySecret(secret),
      p_consent_version: CONSENT_VERSION,
    });
    if (error) throw error;
    const result = (data as ConsentRpcRow[] | null)?.[0];
    if (!result) throw new Error("Missing consent result");
    if (result.result_status === "saved") return NextResponse.json({ status: "saved", holdExpiresAt: result.hold_expires_at });

    const status = result.result_code === "BOOKING_NOT_FOUND" ? 401 : 409;
    const response = NextResponse.json({ code: result.result_code ?? "BOOKING_NOT_ACTIVE" }, { status });
    if (result.result_code === "BOOKING_NOT_FOUND" || result.result_code === "HOLD_EXPIRED") clearBookingSessionCookie(response);
    return response;
  } catch {
    return NextResponse.json({ code: "CONSENT_UNAVAILABLE" }, { status: 503 });
  }
}
