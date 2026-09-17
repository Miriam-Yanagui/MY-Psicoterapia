import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildGoogleAuthorizationUrl,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_STATE_COOKIE,
  htmlResult,
} from "@/lib/google/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const config = getGoogleOAuthConfig();
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(buildGoogleAuthorizationUrl(config, state));
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/google",
      maxAge: 10 * 60,
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  } catch {
    return new NextResponse(
      htmlResult("Conexión no disponible", "Falta completar la configuración privada de Google en el servidor."),
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } },
    );
  }
}
