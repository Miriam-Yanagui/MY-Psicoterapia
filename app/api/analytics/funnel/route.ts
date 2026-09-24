import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { hasAllowedOrigin } from "@/lib/booking-session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENTS = new Set([
  "onboarding_started", "name_reached", "emotion_reached", "experience_reached", "goals_reached",
  "schedule_reached", "hold_created", "checkout_reached", "contact_saved", "payment_started", "confirmation_reached",
]);
const PATH = /^\/onboarding\/[a-z-]{1,32}$/;

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) return NextResponse.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  if (request.headers.get("dnt") === "1" || process.env.VERCEL_ENV !== "production") {
    return NextResponse.json({ status: "ignored" });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const event = typeof body?.event === "string" ? body.event : "";
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId : "";
  const path = typeof body?.path === "string" ? body.path : "";
  if (!EVENTS.has(event) || !UUID.test(visitorId) || !PATH.test(path)) {
    return NextResponse.json({ code: "INVALID_EVENT" }, { status: 400 });
  }
  const pepper = process.env.SUPABASE_SECRET_KEY;
  if (!pepper) return NextResponse.json({ code: "ANALYTICS_UNAVAILABLE" }, { status: 503 });
  const sessionHash = createHmac("sha256", pepper).update(visitorId).digest("hex");
  try {
    const { error } = await createServerSupabaseClient().from("booking_funnel_events").upsert({
      session_hash: sessionHash, event_name: event, path,
    }, { onConflict: "session_hash,event_name", ignoreDuplicates: true });
    if (error) throw error;
    return NextResponse.json({ status: "recorded" }, { status: 201 });
  } catch {
    return NextResponse.json({ code: "ANALYTICS_UNAVAILABLE" }, { status: 503 });
  }
}
