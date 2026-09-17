export type CalendarDay = {
  label: string;
  date: string | null;
  outsideMonth: boolean;
};

/**
 * Generate 42 calendar cells (6 rows × 7 columns) for a given month.
 * Uses UTC arithmetic to avoid timezone-dependent bugs.
 * Week starts on Monday.
 * @param year  - Full year (e.g. 2026)
 * @param month - 0-based month (0 = January, 11 = December)
 */
export function generateMonthDays(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));

  const startDay = firstOfMonth.getUTCDay();
  const mondayIndex = (startDay + 6) % 7;
  const daysInMonth = lastOfMonth.getUTCDate();

  const result: CalendarDay[] = [];

  // Previous month padding
  const prevMonthLast = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let i = mondayIndex - 1; i >= 0; i--) {
    result.push({
      label: String(prevMonthLast - i),
      date: null,
      outsideMonth: true,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const mm = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    result.push({
      label: String(day),
      date: `${year}-${mm}-${dd}`,
      outsideMonth: false,
    });
  }

  // Next month padding to fill 42 cells
  const remaining = 42 - result.length;
  for (let day = 1; day <= remaining; day++) {
    result.push({
      label: String(day),
      date: null,
      outsideMonth: true,
    });
  }

  return result;
}

/**
 * Build ISO-8601 boundary strings for a month in America/Mexico_City.
 * Returns `from` (inclusive, start of month 00:00 local) and
 * `to` (exclusive, start of next month 00:00 local).
 */
export function getMonthBoundaries(year: number, month: number): { from: string; to: string } {
  const from = buildLocalIso(year, month, 1);
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const to = buildLocalIso(nextYear, nextMonth, 1);
  return { from, to };
}

function buildLocalIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}T00:00:00-06:00`;
}

/** Format month label: "SEPTIEMBRE 2026" */
const MONTH_NAMES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

export function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"] as const;
