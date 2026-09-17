import "server-only";

import { getMercadoPagoOrder } from "@/lib/mercado-pago/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type MercadoPagoReconciliationResult = {
  result_status: string;
  result_code: string | null;
};

export async function reconcileMercadoPagoOrder(orderId: string): Promise<MercadoPagoReconciliationResult> {
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
  const result = (data as MercadoPagoReconciliationResult[] | null)?.[0];
  if (!result) throw new Error("MISSING_RECONCILIATION_RESULT");
  return result;
}
