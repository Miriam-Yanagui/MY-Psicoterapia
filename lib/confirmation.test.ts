import { describe, expect, it } from "vitest";
import { isAuthoritativelyConfirmed } from "./confirmation";
import type { CurrentBooking } from "./booking";

const booking = (status: CurrentBooking["status"], paymentStatus: NonNullable<CurrentBooking["payment"]>["status"]): CurrentBooking => ({
  appointmentId: "appointment", status, holdExpiresAt: null,
  slot: { id: "slot", startsAt: "2035-01-01T18:00:00Z", endsAt: "2035-01-01T18:50:00Z", timezone: "America/Mexico_City" },
  contact: null, amountMinor: 80000, currency: "MXN", payment: { id: "payment", status: paymentStatus },
});

describe("F12 authorization", () => {
  it("allows only confirmed appointment plus authoritative approved payment", () => {
    expect(isAuthoritativelyConfirmed(booking("confirmed", "approved"))).toBe(true);
  });
  it.each(["processing", "pending", "approved_provisional", "rejected"] as const)
    ("rejects payment state %s", (status) => {
      expect(isAuthoritativelyConfirmed(booking("payment_pending", status))).toBe(false);
    });
  it("rejects a missing recovery result", () => expect(isAuthoritativelyConfirmed(null)).toBe(false));
});
