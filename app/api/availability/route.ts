import { NextResponse, type NextRequest } from "next/server";
import type { AvailabilityResponse, AvailabilitySlot } from "@/lib/availability";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_FROM = "2026-09-01T00:00:00-06:00";
const DEFAULT_TO = "2026-10-01T00:00:00-06:00";
const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

function parseRange(request: NextRequest) {
  const fromValue = request.nextUrl.searchParams.get("from") ?? DEFAULT_FROM;
  const toValue = request.nextUrl.searchParams.get("to") ?? DEFAULT_TO;
  const from = new Date(fromValue);
  const to = new Date(toValue);

  if (
    Number.isNaN(from.getTime())
    || Number.isNaN(to.getTime())
    || to <= from
    || to.getTime() - from.getTime() > MAX_RANGE_MS
  ) {
    return null;
  }

  return { from: from.toISOString(), to: to.toISOString() };
}
export async function GET(request: NextRequest) {
  const range = parseRange(request);
  if (!range) {
    return NextResponse.json({ error: "INVALID_AVAILABILITY_RANGE" }, { status: 400 });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: slots, error: slotsError } = await supabase
      .from("slots")
      .select("id, starts_at, ends_at, timezone")
      .eq("availability_status", "open")
      .gte("starts_at", range.from)
      .lt("starts_at", range.to)
      .order("starts_at", { ascending: true });

    if (slotsError) throw slotsError;

    const slotIds = slots.map((slot) => slot.id);
    const occupiedSlotIds = new Set<string>();

    if (slotIds.length > 0) {
      const { data: appointments, error: appointmentsError } = await supabase
        .from("appointments")
        .select("slot_id, status, hold_expires_at")
        .in("slot_id", slotIds)
        .in("status", ["held", "payment_pending", "confirmed"]);

      if (appointmentsError) throw appointmentsError;

      const now = Date.now();
      for (const appointment of appointments) {
        const occupiesSlot = appointment.status === "confirmed"
          || (appointment.hold_expires_at !== null && new Date(appointment.hold_expires_at).getTime() > now);
        if (occupiesSlot) occupiedSlotIds.add(appointment.slot_id);
      }
    }

    const response: AvailabilityResponse = {
      slots: slots
        .filter((slot) => !occupiedSlotIds.has(slot.id))
        .map<AvailabilitySlot>((slot) => ({
          id: slot.id,
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
          timezone: slot.timezone,
        })),
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "AVAILABILITY_UNAVAILABLE" }, { status: 503 });
  }
}
