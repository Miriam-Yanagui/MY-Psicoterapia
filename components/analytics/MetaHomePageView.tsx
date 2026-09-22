"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/flow";

const PIXEL_ID = "2655379324882292";
const CONSENT_KEY = "miriam_cookie_consent_v2";

type MetaPixel = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: MetaPixel;
    _fbq?: MetaPixel;
  }
}

function hasMarketingConsent() {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) || "null")?.marketing === true;
  } catch {
    return false;
  }
}

function initializePixel() {
  if (window.fbq) return;

  const fbq: MetaPixel = (...args) => {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue?.push(args);
  };
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = fbq;
  window.fbq = window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", PIXEL_ID);
}

export function MetaHomePageView() {
  const pathname = usePathname();
  const tracked = useRef(false);

  useEffect(() => {
    if (pathname !== routes.home) {
      tracked.current = false;
      return;
    }

    const trackWhenAllowed = () => {
      if (tracked.current || !hasMarketingConsent()) return;
      const eventId = crypto.randomUUID();
      initializePixel();
      window.fbq?.("track", "PageView", {}, { eventID: eventId });
      tracked.current = true;
      void fetch("/api/meta/page-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => undefined);
    };

    trackWhenAllowed();
    window.addEventListener("miriam:consent-updated", trackWhenAllowed);
    return () => window.removeEventListener("miriam:consent-updated", trackWhenAllowed);
  }, [pathname]);

  return null;
}
