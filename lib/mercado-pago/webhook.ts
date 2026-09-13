import { createHmac, timingSafeEqual } from "node:crypto";

const TIMESTAMP = /^\d+$/;

export type MercadoPagoWebhookSignatureInput = {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string | undefined;
};

export function webhookManifest(dataId: string, requestId: string, timestamp: string): string {
  return `id:${dataId};request-id:${requestId};ts:${timestamp};`;
}

export function signWebhookManifest(dataId: string, requestId: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(webhookManifest(dataId, requestId, timestamp)).digest("hex");
}

export function validateMercadoPagoWebhookSignature(input: MercadoPagoWebhookSignatureInput): boolean {
  if (!input.secret || !input.xSignature || !input.xRequestId || !input.dataId) return false;
  const xRequestId = input.xRequestId.trim();
  const dataId = input.dataId.trim();
  if (!xRequestId || !dataId) return false;
  const parts = new Map(input.xSignature.trim().split(",").map((part) => {
    const separator = part.indexOf("=");
    return separator > 0 ? [part.slice(0, separator).trim().toLowerCase(), part.slice(separator + 1).trim()] : ["", ""];
  }));
  const timestamp = parts.get("ts");
  const received = parts.get("v1");
  if (!timestamp || !received || !TIMESTAMP.test(timestamp)) return false;
  const expected = signWebhookManifest(dataId, xRequestId, timestamp, input.secret);
  if (Buffer.byteLength(received) !== Buffer.byteLength(expected)) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
