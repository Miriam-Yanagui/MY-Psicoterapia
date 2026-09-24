import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { upsert } = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock("@/lib/booking-session", () => ({ hasAllowedOrigin: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => ({ from: () => ({ upsert }) }),
}));

import { POST } from "./route";

function request(event = "checkout_reached") {
  return new Request("https://example.com/api/analytics/funnel", {
    method: "POST", headers: { origin: "https://example.com", "Content-Type": "application/json" },
    body: JSON.stringify({ event, visitorId: "af59f1db-4b17-4cb9-b3e1-a7716f0249e1", path: "/onboarding/checkout" }),
  });
}

beforeEach(() => {
  upsert.mockReset();
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("SUPABASE_SECRET_KEY", "server-secret");
  upsert.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("funnel endpoint", () => {
  it("stores a hashed session without personal or appointment data", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      event_name: "checkout_reached", path: "/onboarding/checkout",
      session_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    }), expect.anything());
    const stored = upsert.mock.calls[0][0];
    expect(stored).not.toHaveProperty("visitorId");
    expect(stored).not.toHaveProperty("appointment_id");
  });

  it("rejects unknown events", async () => {
    const response = await POST(request("name_answered"));
    expect(response.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});
