import { describe, expect, it, vi, afterEach } from "vitest";
import { parseBookingIntake, saveBookingIntake } from "./intake";

const valid = { name: " Ana ", emotion: "Bien", therapyExperience: "Primera vez",
  goals: ["Conocerme mejor"], goalsAdditionalNotes: "  Quiero hablar de mi familia  " };

afterEach(() => vi.unstubAllGlobals());

describe("booking intake", () => {
  it("normalizes and validates all required answers", () => {
    expect(parseBookingIntake(valid)).toEqual({ ...valid, name: "Ana", goalsAdditionalNotes: "Quiero hablar de mi familia" });
    expect(parseBookingIntake({ ...valid, emotion: null })).toBeNull();
    expect(parseBookingIntake({ ...valid, goals: [] })).toBeNull();
    expect(parseBookingIntake({ ...valid, goals: ["Conocerme mejor", "Conocerme mejor"] })).toBeNull();
  });

  it("sends the intake for durable server persistence and preserves failures", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, status: 409,
      json: async () => ({ code: "HOLD_EXPIRED" }) });
    vi.stubGlobal("fetch", fetchMock);
    const intake = parseBookingIntake(valid)!;
    await saveBookingIntake(intake);
    expect(fetchMock).toHaveBeenCalledWith("/api/bookings/intake", expect.objectContaining({ method: "POST", body: JSON.stringify(intake) }));
    await expect(saveBookingIntake(intake)).rejects.toMatchObject({ code: "HOLD_EXPIRED", status: 409 });
  });
});
