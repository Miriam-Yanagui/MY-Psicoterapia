import { generateMonthDays, getMonthLabel, WEEKDAYS } from "@/lib/calendar";

export function Calendar({
  year,
  month,
  availableDates,
  selectedDate,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  canGoPrevious,
  canGoNext,
}: {
  year: number;
  month: number;
  availableDates: ReadonlySet<string>;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}) {
  const calendarDays = generateMonthDays(year, month);

  return <>
    <div className="calendar-header">
      <button type="button" aria-label="Mes anterior" disabled={!canGoPrevious} onClick={onPreviousMonth}>‹</button>
      <strong>{getMonthLabel(year, month)}</strong>
      <button type="button" aria-label="Mes siguiente" disabled={!canGoNext} onClick={onNextMonth}>›</button>
    </div>
    <div className="calendar-week" aria-hidden="true">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
    <div className="calendar-days" role="grid" aria-label={getMonthLabel(year, month)}>
      {calendarDays.map((day, index) => {
        const available = day.date !== null && availableDates.has(day.date);
        const selected = available && selectedDate === day.date;
        return <button key={`${day.label}-${index}`} type="button" role="gridcell" className={`${day.outsideMonth ? "outside" : ""} ${selected ? "selected" : ""}`} disabled={!available} aria-selected={selected} onClick={() => day.date && onSelectDate(day.date)}>{day.label}</button>;
      })}
    </div>
  </>;
}
