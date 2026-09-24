import type { Emotion, Goal, TherapyExperience } from "@/lib/types";

export type BookingIntake = { name: string; emotion: Emotion; therapyExperience: TherapyExperience; goals: Goal[]; goalsAdditionalNotes: string };
export const emotions: Emotion[] = ["Bien", "Preocupado/a", "Cansado/a", "Con estrés", "Triste", "Frustrado/a", "Pensativo/a", "No estoy seguro/a"];
export const experiences: TherapyExperience[] = ["Primera vez", "He asistido antes", "Estoy retomándola"];
export const goals: Goal[] = ["Entender lo que siento", "Sentirme con más calma", "Mejorar mis relaciones", "Atravesar un cambio", "Conocerme mejor", "Prefiero hablarlo en sesión"];

export function parseBookingIntake(raw: unknown): BookingIntake | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const notes = typeof value.goalsAdditionalNotes === "string" ? value.goalsAdditionalNotes.trim() : "";
  if (!name || name.length > 120 || !emotions.includes(value.emotion as Emotion)
      || !experiences.includes(value.therapyExperience as TherapyExperience)
      || !Array.isArray(value.goals) || value.goals.length < 1 || value.goals.length > goals.length
      || value.goals.some((goal) => !goals.includes(goal)) || new Set(value.goals).size !== value.goals.length
      || notes.length > 2000) return null;
  return { name, emotion: value.emotion as Emotion, therapyExperience: value.therapyExperience as TherapyExperience,
    goals: value.goals as Goal[], goalsAdditionalNotes: notes };
}

export async function saveBookingIntake(intake: BookingIntake): Promise<void> {
  const response = await fetch("/api/bookings/intake", { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(intake) });
  if (response.ok) return;
  const payload = await response.json().catch(() => null) as { code?: string } | null;
  throw Object.assign(new Error(payload?.code ?? "INTAKE_UNAVAILABLE"), { code: payload?.code ?? "INTAKE_UNAVAILABLE", status: response.status });
}
