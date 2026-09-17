// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", { src: String(props.src), alt: String(props.alt) }),
}));
vi.mock("motion/react", () => ({
  motion: new Proxy({}, { get: (_, tag) => tag }),
}));
vi.mock("@/lib/motion", () => ({ useReducedMotion: () => true }));
vi.mock("@/components/ui/ScreenLift", () => ({ ScreenLift: ({ children }: { children: React.ReactNode }) => children }));

import SchedulePage from "@/app/onboarding/schedule/page";
import { OnboardingProvider } from "@/context/OnboardingProvider";

describe("SchedulePage date selection", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-09-16T19:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      slots: [
        {
          id: "slot-17-14",
          startsAt: "2026-09-17T14:00:00-06:00",
          endsAt: "2026-09-17T14:50:00-06:00",
          timezone: "America/Mexico_City",
        },
      ],
    }), { status: 200 })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("selects an available date and reveals its time", async () => {
    render(<OnboardingProvider><SchedulePage /></OnboardingProvider>);

    const day = await screen.findByRole("gridcell", { name: "17" }) as HTMLButtonElement;
    await waitFor(() => expect(day.disabled).toBe(false));
    fireEvent.click(day);

    expect(day.getAttribute("aria-selected")).toBe("true");
    expect(await screen.findByRole("button", { name: "14:00" })).toBeTruthy();
  });
});
