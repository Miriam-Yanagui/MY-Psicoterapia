// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MetaHomePageView } from "@/components/analytics/MetaHomePageView";

vi.mock("next/navigation", () => ({ usePathname: () => "/onboarding/home" }));

describe("Meta home PageView", () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.fbq;
    delete window._fbq;
  });

  afterEach(() => {
    cleanup();
    document.querySelectorAll('script[src*="fbevents.js"]').forEach((script) => script.remove());
  });

  it("waits for marketing consent and sends one visit when consent is granted", () => {
    render(<MetaHomePageView />);
    expect(window.fbq).toBeUndefined();

    localStorage.setItem("miriam_cookie_consent_v2", JSON.stringify({ marketing: true }));
    window.dispatchEvent(new Event("miriam:consent-updated"));
    window.dispatchEvent(new Event("miriam:consent-updated"));

    expect(window.fbq?.queue).toEqual([
      ["init", "2655379324882292"],
      ["track", "PageView"],
    ]);
    expect(document.querySelectorAll('script[src*="fbevents.js"]')).toHaveLength(1);
  });

  it("does not load the Pixel when marketing is rejected", () => {
    localStorage.setItem("miriam_cookie_consent_v2", JSON.stringify({ marketing: false }));
    render(<MetaHomePageView />);
    window.dispatchEvent(new Event("miriam:consent-updated"));
    expect(window.fbq).toBeUndefined();
  });
});
