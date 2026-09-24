import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { rpc, createOrder } = vi.hoisted(() => ({ rpc: vi.fn(), createOrder: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: () => ({ rpc }) }));
vi.mock("@/lib/mercado-pago/server", () => ({ createMercadoPagoOrder: createOrder }));
vi.mock("@/lib/booking-session", () => ({
  BOOKING_SESSION_COOKIE: "miriam_booking_session",
  hasAllowedOrigin: () => true,
  hashBookingRecoverySecret: () => "hash",
}));

import { POST } from "./route";

const key = "af59f1db-4b17-4cb9-b3e1-a7716f0249e1";
function request() {
  return new NextRequest("https://example.com/api/payments", {
    method: "POST", headers: { origin: "https://example.com", "Idempotency-Key": key,
      cookie: "miriam_booking_session=secret", "Content-Type": "application/json" },
    body: JSON.stringify({ token: "tok_1234567890", paymentMethodId: "visa", paymentTypeId: "credit_card",
      installments: 1, payerEmail: "ana@example.com" }),
  });
}

beforeEach(() => { rpc.mockReset(); createOrder.mockReset(); });

describe("payment prerequisites", () => {
  it.each(["INTAKE_REQUIRED", "CONTACT_REQUIRED"])("returns %s without creating a Mercado Pago order", async (code) => {
    rpc.mockResolvedValue({ data: [{ result_status: "unavailable", result_code: code }], error: null });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ code });
    expect(createOrder).not.toHaveBeenCalled();
  });
});
