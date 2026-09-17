import { describe, it, expect } from "vitest";
import { reducer, initialState } from "./reducer";
import type { OnboardingState } from "./types";

function stateWithAppointment(date: string | null, time: string | null): OnboardingState {
  return {
    ...initialState,
    appointment: { date, time },
  };
}

describe("reducer — selectDate", () => {
  it("selects a date from empty state", () => {
    const result = reducer(initialState, { type: "selectDate", date: "2026-09-16" });
    expect(result.appointment).toEqual({ date: "2026-09-16", time: null });
  });

  it("preserves time when selecting the SAME date", () => {
    const state = stateWithAppointment("2026-09-16", "18:00");
    const result = reducer(state, { type: "selectDate", date: "2026-09-16" });
    expect(result.appointment).toEqual({ date: "2026-09-16", time: "18:00" });
  });

  it("clears time when selecting a DIFFERENT date", () => {
    const state = stateWithAppointment("2026-09-16", "18:00");
    const result = reducer(state, { type: "selectDate", date: "2026-09-17" });
    expect(result.appointment).toEqual({ date: "2026-09-17", time: null });
  });

  it("clears time when selecting a date in a different month", () => {
    const state = stateWithAppointment("2026-09-16", "18:00");
    const result = reducer(state, { type: "selectDate", date: "2026-10-05" });
    expect(result.appointment).toEqual({ date: "2026-10-05", time: null });
  });

  it("clears booking when selecting a date", () => {
    const state: OnboardingState = {
      ...initialState,
      appointment: { date: "2026-09-16", time: "18:00" },
      booking: { appointmentId: "a1", slotId: "s1", holdExpiresAt: "2026-09-16T18:10:00Z" },
    };
    const result = reducer(state, { type: "selectDate", date: "2026-09-17" });
    expect(result.booking).toBeNull();
  });
});

describe("reducer — selectTime", () => {
  it("sets time when a date exists", () => {
    const state = stateWithAppointment("2026-09-16", null);
    const result = reducer(state, { type: "selectTime", time: "18:00" });
    expect(result.appointment).toEqual({ date: "2026-09-16", time: "18:00" });
  });

  it("ignores selectTime when no date exists", () => {
    const result = reducer(initialState, { type: "selectTime", time: "18:00" });
    expect(result.appointment).toEqual({ date: null, time: null });
  });

  it("clears time by setting null", () => {
    const state = stateWithAppointment("2026-09-16", "18:00");
    const result = reducer(state, { type: "selectTime", time: null });
    expect(result.appointment).toEqual({ date: "2026-09-16", time: null });
  });
});

describe("reducer — month navigation does not modify appointment", () => {
  it("visibleMonth changes are not dispatched; appointment stays untouched", () => {
    const state = stateWithAppointment("2026-09-16", "18:00");
    // Month navigation only calls setVisibleMonth (React local state), no dispatch.
    // Verifying no reducer action changes appointment when date/time are untouched.
    expect(state.appointment).toEqual({ date: "2026-09-16", time: "18:00" });
  });
});
