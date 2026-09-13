import { describe, expect, it } from "vitest";
import { signWebhookManifest, validateMercadoPagoWebhookSignature, webhookManifest } from "./webhook";

describe("Mercado Pago Orders webhook signature", () => {
  const dataId = "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3";
  const requestId = "2066ca19-c6f1-498a-be75-1923005edd06";
  const timestamp = "1742505638683";
  const secret = "webhook-secret-for-known-vector";
  // Fixed vector for the exact Mercado Pago manifest documented for Orders webhooks.
  const expected = "b5f69e77478fe8af20ea4e729b686a882e73c5b2a9ac48e889ba942761d94039";

  it("builds the official manifest without normalization", () => {
    expect(webhookManifest(dataId, requestId, timestamp))
      .toBe(`id:${dataId};request-id:${requestId};ts:${timestamp};`);
  });

  it("matches the known HMAC-SHA256 vector", () => {
    expect(signWebhookManifest(dataId, requestId, timestamp, secret)).toBe(expected);
    expect(validateMercadoPagoWebhookSignature({
      xSignature: `ts=${timestamp},v1=${expected}`, xRequestId: requestId, dataId, secret,
    })).toBe(true);
  });

  it.each([
    `ts=${timestamp},v1=${"0".repeat(64)}`,
    `ts=${timestamp},v1=${"é"}${"a".repeat(63)}`,
    `v1=${expected}`,
  ])("rejects malformed or invalid signatures", (xSignature) => {
    expect(validateMercadoPagoWebhookSignature({ xSignature, xRequestId: requestId, dataId, secret })).toBe(false);
  });
});
