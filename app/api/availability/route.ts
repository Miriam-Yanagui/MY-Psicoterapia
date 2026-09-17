import { NextResponse, type NextRequest } from "next/server";
import type { AvailabilityResponse, AvailabilitySlot } from "@/lib/availability";
import { buildRollingAvailability, getRollingAvailabilityWindow } from "@/lib/availabilitySchedule";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

function parseRange(request: NextRequest) {
  const fromValue = request.nextUrl.searchParams.get("from");
  const toValue = request.nextUrl.searchParams.get("to");

  if (!fromValue || !toValue) return null;

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
    const now = new Date();
    const window = getRollingAvailabilityWindow(now);
    const effectiveFrom = new Date(Math.max(new Date(range.from).getTime(), new Date(window.from).getTime())).toISOString();
    const effectiveTo = new Date(Math.min(new Date(range.to).getTime(), new Date(window.to).getTime())).toISOString();

    if (effectiveTo <= effectiveFrom) {
      return NextResponse.json({ slots: [] } satisfies AvailabilityResponse, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const generatedSlots = buildRollingAvailability({ now, from: effectiveFrom, to: effectiveTo });
    const { data: existingSlots, error: existingSlotsError } = await supabase
      .from("slots")
      .select("starts_at, ends_at")
      .gte("starts_at", effectiveFrom)
      .lt("starts_at", effectiveTo);

    if (existingSlotsError) throw existingSlotsError;

    const existingSlotKeys = new Set(
      existingSlots.map((slot) => `${new Date(slot.starts_at).toISOString()}|${new Date(slot.ends_at).toISOString()}`),
    );
    const missingSlots = generatedSlots.filter(
      (slot) => !existingSlotKeys.has(`${new Date(slot.starts_at).toISOString()}|${new Date(slot.ends_at).toISOString()}`),
    );
    const generationBatchSize = 50;
    for (let index = 0; index < missingSlots.length; index += generationBatchSize) {
      const batch = missingSlots.slice(index, index + generationBatchSize);
      const { error: generationError } = await supabase
        .from("slots")
        .upsert(batch, {
          onConflict: "starts_at,ends_at",
          ignoreDuplicates: true,
        });
      if (generationError) throw generationError;
    }

    const { data: slots, error: slotsError } = await supabase
      .from("slots")
      .select("id, starts_at, ends_at, timezone")
      .eq("availability_status", "open")
      .gte("starts_at", effectiveFrom)
      .lt("starts_at", effectiveTo)
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
  } catch (error) {
    console.error("Availability request failed", error);
    return NextResponse.json({ error: "AVAILABILITY_UNAVAILABLE" }, { status: 503 });
  }
}
