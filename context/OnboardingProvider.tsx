"use client";

import { createContext, type Dispatch, type ReactNode, useContext, useMemo, useReducer } from "react";
import type { OnboardingAction, OnboardingState } from "@/lib/types";

const initialState: OnboardingState = {
  name: "",
  emotion: null,
  therapyExperience: null,
  goals: [],
  appointment: { date: "2026-09-16", time: "18:00" },
  contact: { email: "", countryCode: "+52", phone: "", consent: false },
  booking: null,
  bookingRecoveryState: "idle",
};

function reducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "setName": return { ...state, name: action.name };
    case "selectEmotion": return { ...state, emotion: action.emotion };
    case "selectExperience": return { ...state, therapyExperience: action.experience };
    case "toggleGoal": {
      const selected = state.goals.includes(action.goal);
      if (selected) return { ...state, goals: state.goals.filter((goal) => goal !== action.goal) };
      if (state.goals.length >= 2) return state;
      return { ...state, goals: [...state.goals, action.goal] };
    }
    case "selectDate": return {
      ...state,
      appointment: {
        date: action.date,
        time: state.appointment?.date === action.date ? state.appointment.time : null,
      },
      booking: null,
    };
    case "selectTime": {
      if (!state.appointment?.date) return state;
      const nextAppointment = { ...state.appointment, time: action.time };
      const isSameSelection = state.appointment.time === action.time;
      return {
        ...state,
        appointment: nextAppointment,
        booking: isSameSelection ? state.booking : null,
      };
    }
    case "setContactEmail": return { ...state, contact: { ...state.contact, email: action.email } };
    case "setContactCountryCode": return { ...state, contact: { ...state.contact, countryCode: action.countryCode } };
    case "setContactPhone": return { ...state, contact: { ...state.contact, phone: action.phone } };
    case "setContactConsent": return { ...state, contact: { ...state.contact, consent: action.consent } };
    case "setBooking": return { ...state, booking: action.booking, bookingRecoveryState: "ready" };
    case "restoreBooking": return {
      ...state,
      booking: action.booking,
      appointment: action.appointment,
      contact: action.contact ?? state.contact,
      bookingRecoveryState: "ready",
    };
    case "setBookingRecoveryState": return { ...state, bookingRecoveryState: action.state };
    case "clearBooking": return { ...state, booking: null, bookingRecoveryState: "unavailable" };
    case "reset": return initialState;
  }
}

const OnboardingContext = createContext<{ state: OnboardingState; dispatch: Dispatch<OnboardingAction> } | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used within OnboardingProvider");
  return value;
}
