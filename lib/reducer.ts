import type { OnboardingAction, OnboardingState } from "@/lib/types";

const initialState: OnboardingState = {
  name: "",
  emotion: null,
  therapyExperience: null,
  goals: [],
  goalsAdditionalNotes: "",
  appointment: { date: null, time: null },
  contact: { email: "", countryCode: "+52", phone: "", consent: false },
  booking: null,
  bookingRecoveryState: "idle",
};

export function reducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "setName": return { ...state, name: action.name };
    case "selectEmotion": return { ...state, emotion: action.emotion };
    case "selectExperience": return { ...state, therapyExperience: action.experience };
    case "toggleGoal": {
      const selected = state.goals.includes(action.goal);
      if (selected) return { ...state, goals: state.goals.filter((goal) => goal !== action.goal) };
      return { ...state, goals: [...state.goals, action.goal] };
    }
    case "setGoalsAdditionalNotes": return { ...state, goalsAdditionalNotes: action.notes };
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
      name: action.intake?.name ?? state.name,
      emotion: action.intake?.emotion ?? state.emotion,
      therapyExperience: action.intake?.therapyExperience ?? state.therapyExperience,
      goals: action.intake?.goals ?? state.goals,
      goalsAdditionalNotes: action.intake?.goalsAdditionalNotes ?? state.goalsAdditionalNotes,
      bookingRecoveryState: "ready",
    };
    case "setBookingRecoveryState": return { ...state, bookingRecoveryState: action.state };
    case "clearBooking": return { ...state, booking: null, bookingRecoveryState: "unavailable" };
    case "reset": return initialState;
  }
}

export { initialState };
