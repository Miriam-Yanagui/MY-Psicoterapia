import { NextRequest, NextResponse } from "next/server";
import {
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_STATE_COOKIE,
  htmlResult,
  secretsMatch,
} from "@/lib/google/oauth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
};

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string;
};

function resultResponse(title: string, message: string, status: number, success = false) {
  const response = new NextResponse(htmlResult(title, message, success), {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/google",
    maxAge: 0,
  });
  return response;
}

async function revokeGoogleToken(token: string | undefined) {
  if (!token) return;
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    cache: "no-store",
  }).catch(() => undefined);
}

export async function GET(request: NextRequest) {
  const returnedState = request.nextUrl.searchParams.get("state") ?? "";
  const savedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ?? "";

  if (!returnedState || !savedState || !secretsMatch(returnedState, savedState)) {
    return resultResponse("Conexión rechazada", "La solicitud expiró o no pudo comprobarse. Abre nuevamente el enlace de conexión.", 400);
  }

  if (request.nextUrl.searchParams.get("error")) {
    return resultResponse("Permiso cancelado", "Google no recibió autorización. No se guardó ningún acceso.", 400);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return resultResponse("Conexión incompleta", "Google no devolvió el código necesario.", 400);

  try {
    const config = getGoogleOAuthConfig();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    const tokens = await tokenResponse.json() as GoogleTokenResponse;
    if (!tokenResponse.ok || tokens.error || !tokens.refresh_token || !tokens.id_token) {
      await revokeGoogleToken(tokens.refresh_token ?? tokens.access_token);
      return resultResponse("No pudimos guardar el permiso", "Google no entregó un permiso renovable. Intenta otra vez y acepta el acceso a Calendar.", 502);
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`,
      { cache: "no-store" },
    );
    const identity = await tokenInfoResponse.json() as GoogleTokenInfo;
    const authorizedEmail = identity.email?.trim().toLowerCase() ?? "";
    if (!tokenInfoResponse.ok || identity.aud !== config.clientId || identity.email_verified !== "true" || authorizedEmail !== config.expectedEmail) {
      await revokeGoogleToken(tokens.refresh_token);
      return resultResponse("Cuenta incorrecta", `Debes iniciar sesión con ${config.expectedEmail}. No se guardó ningún acceso.`, 403);
    }

    const supabase = createServerSupabaseClient();
    const { error } = await supabase.from("google_oauth_credentials").upsert({
      id: "primary",
      refresh_token: tokens.refresh_token,
      authorized_email: authorizedEmail,
      scope: tokens.scope ?? "",
      token_type: tokens.token_type ?? "Bearer",
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) throw error;

    return resultResponse(
      "Google Calendar quedó conectado",
      `La cuenta ${authorizedEmail} autorizó correctamente a MY Psicoterapia. Ya puedes cerrar esta ventana.`,
      200,
      true,
    );
  } catch {
    return resultResponse("No pudimos terminar la conexión", "No se guardó el permiso. Intenta nuevamente o revisa la configuración del servidor.", 500);
  }
}
