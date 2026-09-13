import "server-only";
import { formatAmount, paymentStatusForProvider, type CardPaymentSubmission } from "@/lib/payment";

export type MercadoPagoOrderInput = CardPaymentSubmission & { amountMinor: number; currency: "MXN"; payerEmail: string; externalReference: string; idempotencyKey: string };
export type MercadoPagoOrderResult = { status: "processing" | "pending" | "approved_provisional" | "rejected"; providerOrderId: string | null; providerPaymentId: string | null; statusDetail: string | null };

const stringValue = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : null;

export function buildMercadoPagoOrder(input: MercadoPagoOrderInput) {
  const amount = formatAmount(input.amountMinor);
  return {
    type: "online", processing_mode: "automatic", external_reference: input.externalReference,
    total_amount: amount, payer: { email: input.payerEmail },
    transactions: { payments: [{ amount, payment_method: {
      id: input.paymentMethodId, type: input.paymentTypeId, token: input.token, installments: input.installments,
    } }] },
  };
}

export async function createMercadoPagoOrder(input: MercadoPagoOrderInput): Promise<MercadoPagoOrderResult> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADO_PAGO_NOT_CONFIGURED");
  const response = await fetch("https://api.mercadopago.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify(buildMercadoPagoOrder(input)), signal: AbortSignal.timeout(15_000),
  });
  const raw = await response.json().catch(() => null) as Record<string, unknown> | null;
  const transactions = raw?.transactions as { payments?: Array<Record<string, unknown>> } | undefined;
  const payment = transactions?.payments?.[0];
  const providerStatus = stringValue(payment?.status) ?? stringValue(raw?.status) ?? "processing";
  const detail = stringValue(payment?.status_detail) ?? stringValue(raw?.status_detail);
  if (!response.ok && (response.status >= 500 || [408, 423, 429].includes(response.status))) throw new Error("MERCADO_PAGO_UNCERTAIN");
  if (!response.ok && [401, 403, 404].includes(response.status)) throw new Error("MERCADO_PAGO_UNAVAILABLE");
  return {
    status: response.ok ? paymentStatusForProvider(providerStatus) : "rejected",
    providerOrderId: stringValue(raw?.id), providerPaymentId: stringValue(payment?.id),
    statusDetail: detail?.slice(0, 120) ?? (response.ok ? null : "provider_rejected"),
  };
}
