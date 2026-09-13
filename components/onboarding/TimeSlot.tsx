export function TimeSlot({ time, selected, onSelect }: { time: string; selected: boolean; onSelect: () => void }) {
  return <button className="time-slot" type="button" aria-pressed={selected} onClick={onSelect}>{time}</button>;
}
