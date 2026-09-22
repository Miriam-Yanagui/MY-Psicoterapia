import { LANDING_URL } from "@/lib/seo";

export const runtime = "nodejs";

const EVENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GRAPH_VERSION = "v21.0";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return new Response(null, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return new Response(null, { status: 415 });
  }

  const raw = await request.text();
  if (raw.length > 256) return new Response(null, { status: 413 });
  let eventId: unknown;
  try { eventId = (JSON.parse(raw) as { event_id?: unknown }).event_id; }
  catch { return new Response(null, { status: 400 }); }
  if (typeof eventId !== "string" || !EVENT_ID.test(eventId)) {
    return new Response(null, { status: 400 });
  }

  const token = process.env.META_CAPI_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;
  if (!token || pixelId !== "2655379324882292") {
    return new Response(null, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = request.headers.get("user-agent");
  if (!ip || !userAgent) return new Response(null, { status: 400 });

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [{
          event_name: "PageView",
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: LANDING_URL,
          action_source: "website",
          user_data: { client_ip_address: ip, client_user_agent: userAgent },
        }] }),
      },
    );
    return new Response(null, { status: response.ok ? 204 : 502 });
  } catch {
    return new Response(null, { status: 502 });
  }
}
