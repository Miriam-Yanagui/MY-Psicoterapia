import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BookingRecoveryError, isBookingNotFound, isTemporaryBookingFailure, recoverCurrentBooking } from "@/lib/booking";
import type { CurrentBooking } from "@/lib/booking";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function fakeBooking(overrides?: Partial<CurrentBooking>): CurrentBooking {
  return {
    appointmentId: "apt-1", status: "held",
    holdExpiresAt: new Date(Date.now() + 600_000).toISOString(),
    slot: { id: "slot-1", startsAt: "2026-09-16T18:00:00-05:00", endsAt: "2026-09-16T18:50:00-05:00", timezone: "America/Mexico_City" },
    contact: null, consented: false, amountMinor: 500, currency: "MXN", payment: null,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Classification helpers                                            */
/* ------------------------------------------------------------------ */

describe("BookingRecoveryError", () => {
  it("isBookingNotFound returns true for not_found kind", () => {
    expect(isBookingNotFound(new BookingRecoveryError("not_found"))).toBe(true);
  });
  it("isTemporaryBookingFailure returns true for temporary_failure kind", () => {
    expect(isTemporaryBookingFailure(new BookingRecoveryError("temporary_failure"))).toBe(true);
  });
  it("isTemporaryBookingFailure returns false for non-BookingRecoveryError", () => {
    expect(isTemporaryBookingFailure(new Error("generic"))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  recoverCurrentBooking HTTP behavior                                */
/* ------------------------------------------------------------------ */

describe("recoverCurrentBooking", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { fetchSpy = vi.spyOn(globalThis, "fetch"); });
  afterEach(() => { fetchSpy.mockRestore(); });

  it("returns CurrentBooking on 200", async () => {
    const booking = fakeBooking();
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(booking), { status: 200 }));
    expect(await recoverCurrentBooking()).toEqual(booking);
  });

  it("returns null on 401", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));
    expect(await recoverCurrentBooking()).toBeNull();
  });

  it("returns null on 404", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 404 }));
    expect(await recoverCurrentBooking()).toBeNull();
  });

  it("throws temporary_failure on 500", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(recoverCurrentBooking()).rejects.toSatisfy(
      (e) => e instanceof BookingRecoveryError && e.kind === "temporary_failure",
    );
  });

  it("throws temporary_failure on 503", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(recoverCurrentBooking()).rejects.toSatisfy(
      (e) => e instanceof BookingRecoveryError && e.kind === "temporary_failure",
    );
  });

  it("throws temporary_failure on network failure", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(recoverCurrentBooking()).rejects.toSatisfy(
      (e) => e instanceof BookingRecoveryError && e.kind === "temporary_failure",
    );
  });
});
