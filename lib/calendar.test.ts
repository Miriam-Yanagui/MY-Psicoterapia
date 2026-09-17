import { describe, it, expect } from "vitest";
import { generateMonthDays, getMonthBoundaries, getMonthLabel } from "./calendar";

describe("generateMonthDays", () => {
  it("generates exactly 42 cells", () => {
    const days = generateMonthDays(2026, 8); // Sep 2026
    expect(days).toHaveLength(42);
  });

  it("Sep 2026 starts on Tuesday (mondayIndex=1)", () => {
    const days = generateMonthDays(2026, 8);
    // First real day of Sep should be at index 1 (Tuesday)
    expect(days[0].outsideMonth).toBe(true);
    expect(days[1].outsideMonth).toBe(false);
    expect(days[1].date).toBe("2026-09-01");
    expect(days[1].label).toBe("1");
  });

  it("Sep 2026 has 30 days", () => {
    const days = generateMonthDays(2026, 8);
    const currentMonth = days.filter((d) => !d.outsideMonth);
    expect(currentMonth).toHaveLength(30);
    expect(currentMonth[0].date).toBe("2026-09-01");
    expect(currentMonth[29].date).toBe("2026-09-30");
  });

  it("Oct 2026 starts on Thursday (mondayIndex=3)", () => {
    const days = generateMonthDays(2026, 9);
    expect(days[0].outsideMonth).toBe(true);
    expect(days[1].outsideMonth).toBe(true);
    expect(days[2].outsideMonth).toBe(true);
    expect(days[3].outsideMonth).toBe(false);
    expect(days[3].date).toBe("2026-10-01");
  });

  it("Nov 2026 starts on Sunday (mondayIndex=6)", () => {
    const days = generateMonthDays(2026, 10);
    expect(days[6].outsideMonth).toBe(false);
    expect(days[6].date).toBe("2026-11-01");
  });

  it("Dec 2026 → Jan 2027 crossover", () => {
    const days = generateMonthDays(2026, 11);
    const currentMonth = days.filter((d) => !d.outsideMonth);
    expect(currentMonth).toHaveLength(31);
    expect(currentMonth[0].date).toBe("2026-12-01");
    expect(currentMonth[30].date).toBe("2026-12-31");
    // After Dec 31, next month padding begins
    const afterDec = days.findIndex((d) => d.date === null && !d.outsideMonth);
    // All remaining after current month should be outsideMonth
    const lastCurrentIdx = days.lastIndexOf(currentMonth[currentMonth.length - 1]);
    for (let i = lastCurrentIdx + 1; i < 42; i++) {
      expect(days[i].outsideMonth).toBe(true);
    }
  });

  it("Jan 2027 starts on Friday (mondayIndex=4)", () => {
    const days = generateMonthDays(2027, 0);
    expect(days[4].outsideMonth).toBe(false);
    expect(days[4].date).toBe("2027-01-01");
  });

  it("Feb 2028 (leap year) has 29 days", () => {
    const days = generateMonthDays(2028, 1);
    const febDays = days.filter((d) => !d.outsideMonth);
    expect(febDays).toHaveLength(29);
    expect(febDays[28].date).toBe("2028-02-29");
  });

  it("Feb 2027 (non-leap) has 28 days", () => {
    const days = generateMonthDays(2027, 1);
    const febDays = days.filter((d) => !d.outsideMonth);
    expect(febDays).toHaveLength(28);
  });

  it("all outsideMonth cells have date=null", () => {
    const days = generateMonthDays(2026, 8);
    for (const d of days) {
      if (d.outsideMonth) expect(d.date).toBeNull();
    }
  });

  it("all current month cells have YYYY-MM-DD format", () => {
    const days = generateMonthDays(2026, 8);
    for (const d of days) {
      if (!d.outsideMonth) {
        expect(d.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });
});

describe("getMonthBoundaries", () => {
  it("Sep 2026 boundaries", () => {
    const { from, to } = getMonthBoundaries(2026, 8);
    expect(from).toBe("2026-09-01T00:00:00-06:00");
    expect(to).toBe("2026-10-01T00:00:00-06:00");
  });

  it("Jan 2027 boundaries (CST)", () => {
    const { from, to } = getMonthBoundaries(2027, 0);
    expect(from).toBe("2027-01-01T00:00:00-06:00");
    expect(to).toBe("2027-02-01T00:00:00-06:00");
  });

  it("Dec 2026 → Jan 2027", () => {
    const { from, to } = getMonthBoundaries(2026, 11);
    expect(from).toBe("2026-12-01T00:00:00-06:00");
    expect(to).toBe("2027-01-01T00:00:00-06:00");
  });

  it("from < to always", () => {
    for (let m = 0; m < 12; m++) {
      const { from, to } = getMonthBoundaries(2026, m);
      expect(new Date(from).getTime()).toBeLessThan(new Date(to).getTime());
    }
  });
});

describe("getMonthLabel", () => {
  it("Sep 2026", () => {
    expect(getMonthLabel(2026, 8)).toBe("SEPTIEMBRE 2026");
  });

  it("Jan 2027", () => {
    expect(getMonthLabel(2027, 0)).toBe("ENERO 2027");
  });

  it("Dec 2026", () => {
    expect(getMonthLabel(2026, 11)).toBe("DICIEMBRE 2026");
  });
});
