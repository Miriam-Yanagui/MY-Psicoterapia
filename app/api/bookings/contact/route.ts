import { NextRequest, NextResponse } from "next/server";
import {
  BOOKING_SESSION_COOKIE,
  clearBookingSessionCookie,
  hasAllowedOrigin,
  hashBookingRecoverySecret,
} from "@/lib/booking-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRY_CODE_PATTERN = /^\+[1-9][0-9]{0,3}$/;
const NATIONAL_PHONE_PATTERN = /^[0-9]{7,14}$/;
const CONSENT_VERSION = "booking-v1";

type ContactRpcRow = {
  result_status: string;
  result_code: string | null;
  appointment_id: string | null;
  hold_expires_at: string | null;
};

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return NextResponse.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  }

  const secret = request.cookies.get(BOOKING_SESSION_COOKIE)?.value;
  if (!secret) return NextResponse.json({ code: "BOOKING_NOT_FOUND" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_CONTACT" }, { status: 400 });
  }

  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const countryCode = typeof input.countryCode === "string" ? input.countryCode.trim() : "";
  const nationalPhone = typeof input.phone === "string" ? input.phone.replace(/\D/g, "") : "";
  const consented = input.consented === true;
  const phone = `${countryCode}${nationalPhone}`;

  if (!EMAIL_PATTERN.test(email) || email.length > 254 || !COUNTRY_CODE_PATTERN.test(countryCode)
      || !NATIONAL_PHONE_PATTERN.test(nationalPhone) || phone.length > 16 || !consented) {
    return NextResponse.json({ code: "INVALID_CONTACT" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.rpc("save_booking_contact", {
      p_booking_access_token_hash: hashBookingRecoverySecret(secret),
      p_email: email,
      p_country_code: countryCode,
      p_phone: phone,
      p_consent_version: CONSENT_VERSION,
    });
    if (error) throw error;

    const result = (data as ContactRpcRow[] | null)?.[0];
    if (!result) throw new Error("Missing contact result");

    if (result.result_status === "saved") {
      return NextResponse.json({ status: "saved", holdExpiresAt: result.hold_expires_at });
    }

    if (result.result_code === "BOOKING_NOT_FOUND") {
      const response = NextResponse.json({ code: "BOOKING_NOT_FOUND" }, { status: 401 });
      clearBookingSessionCookie(response);
      return response;
    }

    const response = NextResponse.json({ code: result.result_code ?? "BOOKING_NOT_ACTIVE" }, { status: 409 });
    if (result.result_code === "HOLD_EXPIRED") clearBookingSessionCookie(response);
    return response;
  } catch {
    return NextResponse.json({ code: "CONTACT_UNAVAILABLE" }, { status: 503 });
  }
}
