import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return <main className="legal-stage">
    <article className="legal-page">
      <Link className="legal-back" href="/onboarding/home" aria-label="Volver al inicio">← Volver</Link>
      <p className="legal-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="legal-updated">Última actualización: {updated}</p>
      <div className="legal-content">{children}</div>
      <nav className="legal-links" aria-label="Documentos legales">
        <Link href="/aviso-de-privacidad">Aviso de privacidad</Link>
        <Link href="/terminos">Términos del servicio</Link>
      </nav>
    </article>
  </main>;
}
