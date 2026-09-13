export type MercadoPagoOrderSnapshot = {
  providerOrderId: string;
  externalReference: string;
  totalAmountMinor: number;
  type: string;
  processingMode: string;
  countryCode: string | null;
  status: string;
  statusDetail: string;
  providerUpdatedAt: string | null;
  payment: { providerPaymentId: string; amountMinor: number; paidAmountMinor: number; status: string; statusDetail: string };
};

const stringValue = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : null;

function amountMinor(value: unknown): number | null {
  const text = stringValue(value);
  if (!text || !/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}

export function parseMercadoPagoOrder(raw: unknown): MercadoPagoOrderSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const order = raw as Record<string, unknown>;
  const transactions = order.transactions && typeof order.transactions === "object"
    ? order.transactions as { payments?: unknown } : null;
  const payments = Array.isArray(transactions?.payments) ? transactions.payments : [];
  if (payments.length !== 1 || !payments[0] || typeof payments[0] !== "object") return null;
  const payment = payments[0] as Record<string, unknown>;
  const providerOrderId = stringValue(order.id);
  const externalReference = stringValue(order.external_reference);
  const totalAmountMinor = amountMinor(order.total_amount);
  const type = stringValue(order.type);
  const processingMode = stringValue(order.processing_mode);
  const status = stringValue(order.status);
  const statusDetail = stringValue(order.status_detail);
  const providerPaymentId = stringValue(payment.id);
  const transactionAmountMinor = amountMinor(payment.amount);
  const paidAmountMinor = amountMinor(payment.paid_amount);
  const transactionStatus = stringValue(payment.status);
  const transactionStatusDetail = stringValue(payment.status_detail);
  if (!providerOrderId || !externalReference || totalAmountMinor === null || !type || !processingMode
      || !status || !statusDetail || !providerPaymentId || transactionAmountMinor === null
      || paidAmountMinor === null || !transactionStatus || !transactionStatusDetail) return null;
  return {
    providerOrderId, externalReference, totalAmountMinor, type, processingMode,
    countryCode: stringValue(order.country_code), status, statusDetail,
    providerUpdatedAt: stringValue(order.last_updated_date),
    payment: { providerPaymentId, amountMinor: transactionAmountMinor, paidAmountMinor,
      status: transactionStatus, statusDetail: transactionStatusDetail },
  };
}
