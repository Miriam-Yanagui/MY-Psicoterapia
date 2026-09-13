import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoOrder } from "@/lib/mercado-pago/server";
import { validateMercadoPagoWebhookSignature } from "@/lib/mercado-pago/webhook";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ORDER_ID = /^[A-Za-z0-9_-]{1,96}$/;
const MAX_BODY_BYTES = 64 * 1024;
type ReconcileRow = { result_status: string; result_code: string | null };

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
    const snapshot = await getMercadoPagoOrder(orderId);
    const { data, error } = await createServerSupabaseClient().rpc("reconcile_mercado_pago_order", {
      p_provider_order_id: snapshot.providerOrderId,
      p_external_reference: snapshot.externalReference,
      p_provider_payment_id: snapshot.payment.providerPaymentId,
      p_order_type: snapshot.type,
      p_processing_mode: snapshot.processingMode,
      p_order_status: snapshot.status,
      p_order_status_detail: snapshot.statusDetail,
      p_transaction_status: snapshot.payment.status,
      p_transaction_status_detail: snapshot.payment.statusDetail,
      p_total_amount_minor: snapshot.totalAmountMinor,
      p_transaction_amount_minor: snapshot.payment.amountMinor,
      p_paid_amount_minor: snapshot.payment.paidAmountMinor,
      p_country_code: snapshot.countryCode,
      p_provider_updated_at: snapshot.providerUpdatedAt,
    });
    if (error) throw error;
    const result = (data as ReconcileRow[] | null)?.[0];
    if (!result) throw new Error("MISSING_RECONCILIATION_RESULT");
    return NextResponse.json({ received: true, result: result.result_status });
  } catch {
    return NextResponse.json({ code: "WEBHOOK_RETRY" }, { status: 503, headers: { "Retry-After": "60" } });
  }
}
