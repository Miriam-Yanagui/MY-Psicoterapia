import { NextRequest, NextResponse } from "next/server";
import { BOOKING_SESSION_COOKIE, hasAllowedOrigin, hashBookingRecoverySecret } from "@/lib/booking-session";
import { createMercadoPagoOrder } from "@/lib/mercado-pago/server";
import type { CardPaymentSubmission, SafePaymentStatus } from "@/lib/payment";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9._-]{10,512}$/;
const METHOD = /^[a-z0-9_-]{1,40}$/;
const TYPES = new Set(["credit_card", "debit_card", "prepaid_card"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type BeginRow = { result_status: string; result_code: string | null; payment_id: string | null; provider_idempotency_key: string | null; external_reference: string | null; amount_minor: number | null; currency: "MXN" | null; payer_email: string | null; payment_status: string | null; should_submit: boolean };
const safeStatus = (status: string | null): SafePaymentStatus =>
  status === "approved_provisional" || status === "pending" || status === "rejected" ? status : "processing";

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) return NextResponse.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  const secret = request.cookies.get(BOOKING_SESSION_COOKIE)?.value;
  if (!secret) return NextResponse.json({ code: "BOOKING_NOT_FOUND" }, { status: 401 });
  const requestedKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ code: "INVALID_PAYMENT" }, { status: 400 }); }
  const body = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const paymentTypeId = typeof body.paymentTypeId === "string" ? body.paymentTypeId : "";
  const input: CardPaymentSubmission = {
    token: typeof body.token === "string" ? body.token : "",
    paymentMethodId: typeof body.paymentMethodId === "string" ? body.paymentMethodId : "",
    paymentTypeId: TYPES.has(paymentTypeId) ? paymentTypeId as CardPaymentSubmission["paymentTypeId"] : "credit_card",
    installments: typeof body.installments === "number" ? body.installments : 0,
    payerEmail: typeof body.payerEmail === "string" ? body.payerEmail.trim().toLowerCase() : "",
  };
  if (!UUID.test(requestedKey) || !TOKEN.test(input.token) || !METHOD.test(input.paymentMethodId)
      || !TYPES.has(paymentTypeId) || !Number.isInteger(input.installments) || input.installments < 1 || input.installments > 24
      || !EMAIL.test(input.payerEmail) || input.payerEmail.length > 254) {
    return NextResponse.json({ code: "INVALID_PAYMENT" }, { status: 400 });
  }

  const recoveryHash = hashBookingRecoverySecret(secret);
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.rpc("begin_payment_attempt_with_email", {
    p_booking_access_token_hash: recoveryHash, p_requested_idempotency_key: requestedKey,
    p_payer_email: input.payerEmail,
  });
  if (error) return NextResponse.json({ code: "PAYMENT_UNAVAILABLE" }, { status: 503 });
  const attempt = (data as BeginRow[] | null)?.[0];
  if (!attempt) return NextResponse.json({ code: "PAYMENT_UNAVAILABLE" }, { status: 503 });
  if (attempt.result_status === "unavailable") {
    return NextResponse.json({ code: attempt.result_code }, { status: attempt.result_code === "BOOKING_NOT_FOUND" ? 401 : 409 });
  }
  if (!attempt.should_submit) return NextResponse.json({
    status: safeStatus(attempt.payment_status), paymentId: attempt.payment_id,
    message: attempt.result_status === "busy" ? "El pago ya se está procesando." : undefined,
  }, { status: attempt.result_status === "busy" ? 202 : 200 });
  if (!attempt.payment_id || !attempt.provider_idempotency_key || !attempt.external_reference
      || !attempt.amount_minor || attempt.currency !== "MXN" || !attempt.payer_email) {
    return NextResponse.json({ code: "PAYMENT_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const result = await createMercadoPagoOrder({ ...input, amountMinor: attempt.amount_minor,
      currency: attempt.currency, payerEmail: attempt.payer_email,
      externalReference: attempt.external_reference, idempotencyKey: attempt.provider_idempotency_key });
    const { error: finishError } = await supabase.rpc("finish_payment_attempt", {
      p_booking_access_token_hash: recoveryHash, p_payment_id: attempt.payment_id, p_status: result.status,
      p_provider_order_id: result.providerOrderId, p_provider_payment_id: result.providerPaymentId,
      p_status_detail: result.statusDetail,
    });
    if (finishError) throw finishError;
    return NextResponse.json({ status: result.status, paymentId: attempt.payment_id });
  } catch (error) {
    await supabase.rpc("finish_payment_attempt", {
      p_booking_access_token_hash: recoveryHash, p_payment_id: attempt.payment_id, p_status: "uncertain",
      p_provider_order_id: null, p_provider_payment_id: null,
      p_status_detail: error instanceof Error && error.message === "MERCADO_PAGO_NOT_CONFIGURED" ? "provider_not_configured" : "provider_result_uncertain",
    });
    return NextResponse.json({ status: "processing", paymentId: attempt.payment_id }, { status: 202 });
  }
}
