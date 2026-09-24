import { describe, expect, it } from "vitest";
import { buildRollingAvailability, getRollingAvailabilityWindow } from "@/lib/availabilitySchedule";

const now = new Date("2026-09-16T17:30:00.000Z"); // 11:30 in Mexico City

describe("rolling availability schedule", () => {
  it("creates hourly weekday starts with 50-minute sessions", () => {
    const slots = buildRollingAvailability({
      now,
      from: "2026-09-17T00:00:00-06:00",
      to: "2026-09-18T00:00:00-06:00",
    });
    expect(slots).toHaveLength(6);
    expect(slots[0]).toMatchObject({ starts_at: "2026-09-17T12:00:00-06:00", ends_at: "2026-09-17T12:50:00-06:00" });
    expect(slots.at(-1)).toMatchObject({ starts_at: "2026-09-17T17:00:00-06:00", ends_at: "2026-09-17T17:50:00-06:00" });
  });

  it("creates two Saturday sessions and no Sunday sessions", () => {
    const slots = buildRollingAvailability({
      now,
      from: "2026-09-19T00:00:00-06:00",
      to: "2026-09-21T00:00:00-06:00",
    });
    expect(slots.map((slot) => slot.starts_at)).toEqual([
      "2026-09-19T11:00:00-06:00",
      "2026-09-19T12:00:00-06:00",
    ]);
  });

  it("only creates sessions at least 24 hours in advance", () => {
    const slots = buildRollingAvailability({
      now,
      from: "2026-09-16T00:00:00-06:00",
      to: "2026-09-17T00:00:00-06:00",
    });
    expect(slots.map((slot) => slot.starts_at)).toEqual([
    ]);

    const nextDaySlots = buildRollingAvailability({
      now,
      from: "2026-09-17T00:00:00-06:00",
      to: "2026-09-18T00:00:00-06:00",
    });
    expect(nextDaySlots.map((slot) => slot.starts_at)).toEqual([
      "2026-09-17T12:00:00-06:00",
      "2026-09-17T13:00:00-06:00",
      "2026-09-17T14:00:00-06:00",
      "2026-09-17T15:00:00-06:00",
      "2026-09-17T16:00:00-06:00",
      "2026-09-17T17:00:00-06:00",
    ]);
  });

  it("keeps a rolling window of 60 local calendar days", () => {
    expect(getRollingAvailabilityWindow(now)).toEqual({
      from: "2026-09-17T17:30:00.000Z",
      to: "2026-11-15T00:00:00-06:00",
    });
  });
});
