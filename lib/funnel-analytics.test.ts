// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyAnalyticsOverrideFromUrl, trackFunnelEvent } from "./funnel-analytics";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState({}, "", "/onboarding/home");
  Object.defineProperty(navigator, "doNotTrack", { value: "0", configurable: true });
  localStorage.setItem("miriam_cookie_consent_v2", JSON.stringify({ analytics: true, marketing: true }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  vi.stubGlobal("crypto", { randomUUID: () => "af59f1db-4b17-4cb9-b3e1-a7716f0249e1" });
});

afterEach(() => vi.unstubAllGlobals());

describe("anonymous funnel analytics", () => {
  it("persists an opt-out from the URL and sends no event", () => {
    history.replaceState({}, "", "/onboarding/home?analytics=off");
    applyAnalyticsOverrideFromUrl();
    trackFunnelEvent("onboarding_started");
    expect(localStorage.getItem("miriam_analytics_opt_out")).toBe("1");
    expect(location.search).toBe("");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows tracking again only with analytics consent", () => {
    localStorage.setItem("miriam_analytics_opt_out", "1");
    history.replaceState({}, "", "/onboarding/home?analytics=on");
    applyAnalyticsOverrideFromUrl();
    trackFunnelEvent("onboarding_started");
    expect(localStorage.getItem("miriam_analytics_opt_out")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("deduplicates an event within one browser session", () => {
    trackFunnelEvent("goals_reached");
    trackFunnelEvent("goals_reached");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
