import Image from "next/image";
import type { TherapyExperience } from "@/lib/types";

const imageByExperience: Record<TherapyExperience, string> = {
  "Primera vez": "experience-primera-vez.png",
  "He asistido antes": "experience-he-asistido-antes.png",
  "Estoy retomándola": "experience-estoy-retomandola.png",
};

export function ExperienceOption({ value, selected, onSelect }: { value: TherapyExperience; selected: boolean; onSelect: () => void }) {
  return <button className="experience-option" type="button" aria-pressed={selected} onClick={onSelect}>
    <Image src={`/assets/${imageByExperience[value]}`} alt="" width={40} height={40} priority />
    <span>{value}</span>
    <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2.25 9.75 6.75 14.25 15.75 4.5" /></svg>
  </button>;
}
