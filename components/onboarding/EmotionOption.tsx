import Image from "next/image";
import type { Emotion } from "@/lib/types";

const imageByEmotion: Record<Emotion, string> = {
  "Bien":"f03-emoji-bien.png", "Preocupado/a":"f03-emoji-preocupado.png",
  "Cansado/a":"f03-emoji-cansado.png", "Con estrés":"f03-emoji-estres.png",
  "Triste":"f03-emoji-triste.png", "Frustrado/a":"f03-emoji-frustrado.png",
  "Pensativo/a":"f03-emoji-pensativo.png", "No estoy seguro/a":"f03-emoji-inseguro.png",
};

export function EmotionOption({ emotion, selected, onSelect }: { emotion: Emotion; selected: boolean; onSelect: () => void }) {
  return <button type="button" className="emotion-option" aria-pressed={selected} onClick={onSelect}>
    <Image src={`/assets/${imageByEmotion[emotion]}`} alt="" width={32} height={52} priority />
    <span>{emotion}</span>
  </button>;
}
