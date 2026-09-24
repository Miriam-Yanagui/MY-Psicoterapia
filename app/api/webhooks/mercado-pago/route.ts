import { NextRequest, NextResponse } from "next/server";
import { reconcileMercadoPagoOrder } from "@/lib/mercado-pago/reconcile";
import { validateMercadoPagoWebhookSignature } from "@/lib/mercado-pago/webhook";
import { processEmailOutbox } from "@/lib/email/outbox";
import { processCalendarOutbox } from "@/lib/google/calendar-outbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ORDER_ID = /^[A-Za-z0-9_-]{1,96}$/;
const MAX_BODY_BYTES = 64 * 1024;

async function bodyWithinLimit(request: Request): Promise<boolean> {
  if (!request.body) return true;
  const reader = request.body.getReader();
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return true;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      return false;
    }
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ code: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }
  const orderId = request.nextUrl.searchParams.get("data.id")?.trim() ?? null;
  const configuredSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!configuredSecret) return NextResponse.json({ code: "WEBHOOK_UNAVAILABLE" }, { status: 503 });
  if (request.nextUrl.searchParams.get("type") !== "order" || !orderId || !ORDER_ID.test(orderId)
      || !validateMercadoPagoWebhookSignature({
        xSignature: request.headers.get("x-signature"),
        xRequestId: request.headers.get("x-request-id"), dataId: orderId, secret: configuredSecret,
      })) return NextResponse.json({ code: "INVALID_SIGNATURE" }, { status: 401 });
  if (!await bodyWithinLimit(request)) return NextResponse.json({ code: "PAYLOAD_TOO_LARGE" }, { status: 413 });

  try {
    const result = await reconcileMercadoPagoOrder(orderId);
    await processCalendarOutbox(4).catch(() => undefined);
    await processEmailOutbox(4).catch(() => undefined);
    return NextResponse.json({ received: true, result: result.result_status });
  } catch {
    return NextResponse.json({ code: "WEBHOOK_RETRY" }, { status: 503, headers: { "Retry-After": "60" } });
  }
}
