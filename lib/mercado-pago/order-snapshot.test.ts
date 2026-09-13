import { describe, expect, it } from "vitest";
import { parseMercadoPagoOrder } from "./order-snapshot";

const order = {
  id: "ORD-1", external_reference: "miriam-payment-1", total_amount: "800.00",
  type: "online", processing_mode: "automatic", country_code: "MX",
  status: "processed", status_detail: "accredited", last_updated_date: "2026-09-13T16:00:00Z",
  transactions: { payments: [{ id: "PAY-1", amount: "800.00", paid_amount: "800.00",
    status: "processed", status_detail: "accredited", payment_method: { token: "must-not-escape" } }] },
};

describe("authoritative Order snapshot", () => {
  it("keeps only reconciliation fields and converts money exactly", () => {
    const snapshot = parseMercadoPagoOrder(order);
    expect(snapshot?.totalAmountMinor).toBe(80000);
    expect(snapshot?.payment.paidAmountMinor).toBe(80000);
    expect(JSON.stringify(snapshot)).not.toContain("must-not-escape");
  });
  it.each(["800.001", "NaN", -800])("rejects invalid amounts", (total_amount) => {
    expect(parseMercadoPagoOrder({ ...order, total_amount })).toBeNull();
  });
  it("rejects ambiguous multi-payment orders", () => {
    expect(parseMercadoPagoOrder({ ...order, transactions: { payments: [order.transactions.payments[0], order.transactions.payments[0]] } })).toBeNull();
  });
});
