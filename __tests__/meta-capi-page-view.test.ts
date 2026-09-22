import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/meta/page-view/route";

const EVENT_ID = "11111111-1111-4111-8111-111111111111";
const URL = "https://www.mypsicoterapia.com/api/meta/page-view";

function request(eventId: string, origin = "https://www.mypsicoterapia.com") {
  return new Request(URL, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "User-Agent": "test-browser",
      "X-Forwarded-For": "203.0.113.1",
    },
    body: JSON.stringify({ event_id: eventId }),
  });
}

describe("Meta CAPI PageView", () => {
  beforeEach(() => {
    process.env.META_CAPI_TOKEN = "test-token";
    process.env.META_PIXEL_ID = "2655379324882292";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })));
  });

  afterEach(() => {
    delete process.env.META_CAPI_TOKEN;
    delete process.env.META_PIXEL_ID;
    vi.unstubAllGlobals();
  });

  it("sends only the consented home visit with the browser event ID", async () => {
    expect((await POST(request(EVENT_ID))).status).toBe(204);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(options?.body));
    expect(payload.data).toEqual([expect.objectContaining({
      event_name: "PageView",
      event_id: EVENT_ID,
      event_source_url: "https://www.mypsicoterapia.com/onboarding/home",
      user_data: { client_ip_address: "203.0.113.1", client_user_agent: "test-browser" },
    })]);
    expect(payload.data[0]).not.toHaveProperty("custom_data");
  });

  it("rejects cross-site and invalid event IDs before contacting Meta", async () => {
    expect((await POST(request(EVENT_ID, "https://example.com"))).status).toBe(403);
    expect((await POST(request("not-an-id"))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
