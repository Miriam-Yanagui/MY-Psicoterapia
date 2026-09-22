import { describe, expect, it } from "vitest";
import { calculateScreenLift } from "@/lib/screenFit";

const base = { contentBottom: 805, safeBottom: 16, maxLift: 100, minFitHeight: 700 };

describe("calculateScreenLift", () => {
  it("does not lift when the width-first canvas content fits", () => {
    expect(calculateScreenLift({ ...base, viewportWidth: 390, viewportHeight: 844 })).toBe(0);
  });

  it("lifts only the missing design-space height", () => {
    expect(calculateScreenLift({ ...base, viewportWidth: 390, viewportHeight: 780 })).toBe(41);
  });

  it("accounts for width-first scaling", () => {
    expect(calculateScreenLift({ ...base, viewportWidth: 412, viewportHeight: 783 })).toBe(80);
  });

  it("caps lift at the screen-specific safe maximum", () => {
    expect(calculateScreenLift({ ...base, viewportWidth: 390, viewportHeight: 710 })).toBe(100);
  });

  it("preserves scroll fallback on extremely short viewports", () => {
    expect(calculateScreenLift({ ...base, viewportWidth: 375, viewportHeight: 667 })).toBe(0);
  });

  it("can keep fitting on short viewports when a screen opts in", () => {
    expect(calculateScreenLift({ ...base, minFitHeight: 0, maxLift: 180, viewportWidth: 375, viewportHeight: 617 })).toBe(180);
  });

  it("includes the device safe area in the requested clearance", () => {
    expect(calculateScreenLift({ ...base, minFitHeight: 0, safeBottom: 50, viewportWidth: 390, viewportHeight: 780 })).toBe(75);
  });

  it("does not apply mobile fitting on desktop", () => {
    expect(calculateScreenLift({ ...base, viewportWidth: 1280, viewportHeight: 720 })).toBe(0);
  });
});
