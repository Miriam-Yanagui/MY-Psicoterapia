import "server-only";

import { timingSafeEqual } from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE = "mypsi_google_oauth_state";
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  connectSecret: string;
  expectedEmail: string;
};

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const config = {
    clientId: (process.env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_OAUTH_CLIENT_ID)?.trim() ?? "",
    clientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_OAUTH_CLIENT_SECRET)?.trim() ?? "",
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? "",
    connectSecret: process.env.GOOGLE_OAUTH_CONNECT_SECRET?.trim() ?? "",
    expectedEmail: process.env.MIRIAM_GOOGLE_EMAIL?.trim().toLowerCase() ?? "",
  };

  if (Object.values(config).some((value) => !value)) {
    throw new Error("Google OAuth environment is not configured");
  }
  if (config.connectSecret.length < 32) {
    throw new Error("Google OAuth connection secret must have at least 32 characters");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.expectedEmail)) {
    throw new Error("Miriam Google email is invalid");
  }

  const redirectUrl = new URL(config.redirectUri);
  if (redirectUrl.protocol !== "https:" && redirectUrl.hostname !== "localhost") {
    throw new Error("Google OAuth redirect URI must use HTTPS");
  }

  return config;
}

export function secretsMatch(received: string, expected: string): boolean {
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(expected);
  return receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes);
}

export function buildGoogleAuthorizationUrl(config: GoogleOAuthConfig, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: `openid email ${GOOGLE_CALENDAR_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: config.expectedEmail,
    state,
  }).toString();
  return url.toString();
}

export function htmlResult(title: string, message: string, success = false): string {
  const accent = success ? "#2f8f5b" : "#e74824";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title}</title></head><body style="margin:0;background:#e74824;font-family:Arial,sans-serif;color:#2d2d2d"><main style="box-sizing:border-box;max-width:560px;margin:9vh auto;padding:42px 30px;border-radius:28px;background:#faf4e9;text-align:center"><div style="margin:auto;width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:${accent};color:white;font-size:28px">${success ? "✓" : "!"}</div><h1 style="margin:24px 0 12px;font-size:30px">${title}</h1><p style="margin:0;line-height:1.6">${message}</p></main></body></html>`;
}
