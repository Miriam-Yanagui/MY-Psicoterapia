import type { CurrentBooking } from "@/lib/booking";

export function isAuthoritativelyConfirmed(booking: CurrentBooking | null): boolean {
  return booking?.status === "confirmed" && booking.payment?.status === "approved";
}
