import { NextRequest, NextResponse } from "next/server";
import { BOOKING_SESSION_COOKIE, hasAllowedOrigin, hashBookingRecoverySecret } from "@/lib/booking-session";
import { parseBookingIntake } from "@/lib/intake";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) return NextResponse.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  const secret = request.cookies.get(BOOKING_SESSION_COOKIE)?.value;
  if (!secret) return NextResponse.json({ code: "BOOKING_NOT_FOUND" }, { status: 401 });
  const intake = parseBookingIntake(await request.json().catch(() => null));
  if (!intake) return NextResponse.json({ code: "INVALID_INTAKE" }, { status: 400 });
  try {
    const { data, error } = await createServerSupabaseClient().rpc("save_booking_intake", {
      p_booking_access_token_hash: hashBookingRecoverySecret(secret), p_name: intake.name,
      p_emotion: intake.emotion, p_therapy_experience: intake.therapyExperience,
      p_goals: intake.goals, p_goals_additional_notes: intake.goalsAdditionalNotes || null,
    });
    if (error) throw error;
    const result = (data as { result_status: string; result_code: string | null }[] | null)?.[0];
    if (result?.result_status === "saved") return NextResponse.json({ status: "saved" });
    return NextResponse.json({ code: result?.result_code ?? "INTAKE_UNAVAILABLE" },
      { status: result?.result_code === "BOOKING_NOT_FOUND" ? 401 : 409 });
  } catch {
    return NextResponse.json({ code: "INTAKE_UNAVAILABLE" }, { status: 503 });
  }
}
