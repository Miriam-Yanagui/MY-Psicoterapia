export type SafePaymentStatus = "processing" | "pending" | "approved_provisional" | "rejected";
export type PaymentResult = { status: SafePaymentStatus; paymentId: string; message?: string };
export type CardPaymentSubmission = {
  token: string;
  paymentMethodId: string;
  paymentTypeId: "credit_card" | "debit_card" | "prepaid_card";
  installments: number;
};

export function paymentStatusForProvider(status: string): SafePaymentStatus {
  const value = status.toLowerCase();
  if (["approved", "processed", "paid"].includes(value)) return "approved_provisional";
  if (["rejected", "cancelled", "failed"].includes(value)) return "rejected";
  if (["pending", "action_required"].includes(value)) return "pending";
  return "processing";
}

export function formatAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

export async function submitCardPayment(submission: CardPaymentSubmission, idempotencyKey: string): Promise<PaymentResult> {
  const response = await fetch("/api/payments", {
    method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(submission),
  });
  const payload = await response.json().catch(() => null) as (PaymentResult & { code?: string }) | null;
  if (response.ok && payload) return payload;
  throw Object.assign(new Error(payload?.code ?? "PAYMENT_UNAVAILABLE"), {
    code: payload?.code ?? "PAYMENT_UNAVAILABLE", status: response.status,
  });
}
