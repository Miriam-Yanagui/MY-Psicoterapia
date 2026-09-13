import { scheduleCalendarFixture } from "@/lib/mockAvailability";

export function Calendar({ availableDates, selectedDate, onSelectDate }: { availableDates: ReadonlySet<string>; selectedDate: string | null; onSelectDate: (date: string) => void }) {
  return <>
    <div className="calendar-header">
      <button type="button" aria-label="Mes anterior" disabled>‹</button>
      <strong>{scheduleCalendarFixture.monthLabel}</strong>
      <button type="button" aria-label="Mes siguiente" disabled>›</button>
    </div>
    <div className="calendar-week" aria-hidden="true">{scheduleCalendarFixture.weekdays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
    <div className="calendar-days" role="grid" aria-label="Septiembre de 2026">
      {scheduleCalendarFixture.calendarDays.map((day, index) => {
        const available = day.date !== null && availableDates.has(day.date);
        const selected = available && selectedDate === day.date;
        return <button key={`${day.label}-${index}`} type="button" role="gridcell" className={`${day.outsideMonth ? "outside" : ""} ${selected ? "selected" : ""}`} disabled={!available} aria-selected={selected} onClick={() => day.date && onSelectDate(day.date)}>{day.label}</button>;
      })}
    </div>
  </>;
}
