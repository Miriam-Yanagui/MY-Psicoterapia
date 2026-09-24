import type { Database } from "@/lib/supabase/database.types";

export const AVAILABILITY_TIMEZONE = "America/Mexico_City";
const MEXICO_CITY_OFFSET = "-06:00";
const ROLLING_DAYS = 60;
export const BOOKING_LEAD_TIME_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_START_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17] as const;
const SATURDAY_START_HOURS = [11, 12] as const;

type SlotInsert = Database["public"]["Tables"]["slots"]["Insert"];

function datePartsInMexicoCity(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: AVAILABILITY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function localDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date: { year: number; month: number; day: number }, days: number) {
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days, 12));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function startHoursFor(date: { year: number; month: number; day: number }) {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day, 12)).getUTCDay();
  if (weekday === 0) return [];
  if (weekday === 6) return SATURDAY_START_HOURS;
  return WEEKDAY_START_HOURS;
}

function slotIso(localDate: string, hour: number, minute: number) {
  return `${localDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00${MEXICO_CITY_OFFSET}`;
}

export function getRollingAvailabilityWindow(now = new Date()) {
  const today = datePartsInMexicoCity(now);
  const endDate = addDays(today, ROLLING_DAYS);
  return {
    from: new Date(now.getTime() + BOOKING_LEAD_TIME_MS).toISOString(),
    to: slotIso(localDateString(endDate.year, endDate.month, endDate.day), 0, 0),
  };
}

export function buildRollingAvailability({
  now = new Date(),
  from,
  to,
}: {
  now?: Date;
  from: string;
  to: string;
}): SlotInsert[] {
  const requestedFrom = new Date(from).getTime();
  const requestedTo = new Date(to).getTime();
  const earliestStartTime = now.getTime() + BOOKING_LEAD_TIME_MS;
  const today = datePartsInMexicoCity(now);
  const slots: SlotInsert[] = [];

  for (let index = 0; index < ROLLING_DAYS; index += 1) {
    const date = addDays(today, index);
    const localDate = localDateString(date.year, date.month, date.day);
    for (const hour of startHoursFor(date)) {
      const startsAt = slotIso(localDate, hour, 0);
      const endsAt = slotIso(localDate, hour, 50);
      const startTime = new Date(startsAt).getTime();
      if (startTime < earliestStartTime || startTime < requestedFrom || startTime >= requestedTo) continue;
      slots.push({
        starts_at: startsAt,
        ends_at: endsAt,
        timezone: AVAILABILITY_TIMEZONE,
        availability_status: "open",
      });
    }
  }

  return slots;
}
