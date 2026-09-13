export type Emotion =
  | "Bien"
  | "Preocupado/a"
  | "Cansado/a"
  | "Con estrés"
  | "Triste"
  | "Frustrado/a"
  | "Pensativo/a"
  | "No estoy seguro/a";

export type TherapyExperience = "Primera vez" | "He asistido antes" | "Estoy retomándola";

export type Goal =
  | "Entender lo que siento"
  | "Sentirme con más calma"
  | "Mejorar mis relaciones"
  | "Atravesar un cambio"
  | "Conocerme mejor"
  | "Prefiero hablarlo en sesión";

export type BookingHold = {
  appointmentId: string;
  slotId: string;
  holdExpiresAt: string;
  status?: "held" | "payment_pending" | "confirmed";
};

export type BookingRecoveryState = "idle" | "recovering" | "ready" | "unavailable";

export type OnboardingState = {
  name: string;
  emotion: Emotion | null;
  therapyExperience: TherapyExperience | null;
  goals: Goal[];
  appointment: { date: string | null; time: string | null } | null;
  contact: {
    email: string;
    countryCode: string;
    phone: string;
    consent: boolean;
  };
  booking: BookingHold | null;
  bookingRecoveryState: BookingRecoveryState;
};

export type OnboardingAction =
  | { type: "setName"; name: string }
  | { type: "selectEmotion"; emotion: Emotion }
  | { type: "selectExperience"; experience: TherapyExperience }
  | { type: "toggleGoal"; goal: Goal }
  | { type: "selectDate"; date: string }
  | { type: "selectTime"; time: string | null }
  | { type: "setContactEmail"; email: string }
  | { type: "setContactCountryCode"; countryCode: string }
  | { type: "setContactPhone"; phone: string }
  | { type: "setContactConsent"; consent: boolean }
  | { type: "setBooking"; booking: BookingHold }
  | {
      type: "restoreBooking";
      booking: BookingHold;
      appointment: { date: string; time: string };
      contact: OnboardingState["contact"] | null;
    }
  | { type: "setBookingRecoveryState"; state: BookingRecoveryState }
  | { type: "clearBooking" }
  | { type: "reset" };
