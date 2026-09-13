export type CalendarDay = {
  label: string;
  date: string | null;
  outsideMonth: boolean;
};

const septemberDays: CalendarDay[] = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  return {
    label: String(day),
    date: `2026-09-${String(day).padStart(2, "0")}`,
    outsideMonth: false,
  };
});

// Presentation-only fixture for the approved September 2026 calendar.
// Real availability must come from /api/availability.
export const scheduleCalendarFixture = {
  monthLabel: "SEPTIEMBRE 2026",
  weekdays: ["L", "M", "M", "J", "V", "S", "D"],
  calendarDays: [
    { label: "31", date: null, outsideMonth: true },
    ...septemberDays,
    ...["1", "2", "3", "4"].map((label) => ({ label, date: null, outsideMonth: true })),
  ] satisfies CalendarDay[],
  timezoneLabel: "Hora de Guadalajara",
} as const;

// Explicit test fixture; production code does not import it.
export const mockAvailabilityFixture = {
  "2026-09-16": ["10:00", "12:30", "18:00"],
} as const;
