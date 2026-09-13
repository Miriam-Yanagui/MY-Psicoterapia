import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";

export const BOOKING_SESSION_COOKIE = "miriam_booking_session";
const BOOKING_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function createBookingRecoverySecret() {
  const secret = randomBytes(32).toString("base64url");
  return { secret, hash: hashBookingRecoverySecret(secret) };
}

export function hashBookingRecoverySecret(secret: string): string {
  return createHash("sha256").update(secret, "utf8").digest("hex");
}

export function setBookingSessionCookie(response: NextResponse, secret: string) {
  response.cookies.set({
    name: BOOKING_SESSION_COOKIE,
    value: secret,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: BOOKING_SESSION_MAX_AGE_SECONDS,
    priority: "high",
  });
}

export function clearBookingSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: BOOKING_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    priority: "high",
  });
}

export function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return originUrl.protocol === requestUrl.protocol && originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}
