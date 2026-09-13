import type { Goal } from "@/lib/types";

export function GoalOption({ value, selected, disabled, onToggle }: { value: Goal; selected: boolean; disabled: boolean; onToggle: () => void }) {
  return <button className="goal-option" type="button" aria-pressed={selected} disabled={disabled} onClick={onToggle}>
    <span>{value}</span><i aria-hidden="true" />
  </button>;
}
