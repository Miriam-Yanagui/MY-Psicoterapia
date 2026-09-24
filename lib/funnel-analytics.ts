"use client";

const CONSENT_KEY = "miriam_cookie_consent_v2";
const OPT_OUT_KEY = "miriam_analytics_opt_out";
const SESSION_KEY = "miriam_funnel_session";
const SENT_PREFIX = "miriam_funnel_sent:";

export type FunnelEvent =
  | "onboarding_started"
  | "name_reached"
  | "emotion_reached"
  | "experience_reached"
  | "goals_reached"
  | "schedule_reached"
  | "hold_created"
  | "checkout_reached"
  | "contact_saved"
  | "payment_started"
  | "confirmation_reached";

export function isTrackingOptedOut(): boolean {
  if (navigator.doNotTrack === "1") return true;
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return true;
  }
}

function analyticsAllowed(): boolean {
  if (isTrackingOptedOut()) return false;
  try {
    const consent = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") as { analytics?: boolean } | null;
    return consent?.analytics === true;
  } catch {
    return false;
  }
}

function sessionId(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function applyAnalyticsOverrideFromUrl(): void {
  const url = new URL(window.location.href);
  const override = url.searchParams.get("analytics");
  if (override !== "off" && override !== "on") return;
  try {
    if (override === "off") localStorage.setItem(OPT_OUT_KEY, "1");
    else localStorage.removeItem(OPT_OUT_KEY);
  } catch { /* Storage may be unavailable. */ }
  url.searchParams.delete("analytics");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function trackFunnelEvent(event: FunnelEvent): void {
  if (!analyticsAllowed()) return;
  const dedupeKey = `${SENT_PREFIX}${event}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, "1");
    const visitorId = sessionId();
    void fetch("/api/analytics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, visitorId, path: window.location.pathname }),
      keepalive: true,
    }).then((response) => { if (!response.ok) sessionStorage.removeItem(dedupeKey); })
      .catch(() => { sessionStorage.removeItem(dedupeKey); });
  } catch { /* Analytics must never interrupt booking. */ }
}
