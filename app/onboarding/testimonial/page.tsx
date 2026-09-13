"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { routes } from "@/lib/flow";

export default function TestimonialPage() {
  const router = useRouter();
  return <MobileScreen className="f06b">
    <BrandMark />
    <div className="f06b-accent" aria-hidden="true" />
    <p className="f06b-eyebrow">EXPERIENCIA REAL</p>
    <h1 className="f06b-title">No tienes que resolverlo<br />todo a solas.</h1>
    <article className="f06b-card">
      <p className="f06b-quote" aria-hidden="true">“</p><div className="f06b-ring" aria-hidden="true" />
      <Image className="f06b-portrait" src="/assets/f06b-testimonial-portrait.png" alt="Mariana Saldivar" width={59} height={59} priority />
      <p className="f06b-portrait-label">Mariana Saldivar</p>
      <blockquote>Miriam ha sido excelente<br />tanto en lo profesional como<br />en su calidez humana.</blockquote>
      <p className="f06b-stars" aria-label="Cinco estrellas">★★★★★</p>
      <p className="f06b-attribution">Opinión publicada en Doctoralia</p>
      <p className="f06b-note">Testimonio provisional · sujeto a autorización</p>
    </article>
    <button className="f06b-button" type="button" onClick={() => router.push(routes.goals)}>Continuar<Image src="/assets/f02-arrow-right.png" alt="" width={18} height={18} /></button>
  </MobileScreen>;
}
