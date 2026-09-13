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
  | { type: "reset" };
