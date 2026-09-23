"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const WHATSAPP_NUMBER = "523314609228";

export function FloatingSupport() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function closeOnOutsideClick(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  if (!pathname.startsWith("/onboarding/")) return null;

  const message = `Hola, necesito ayuda para agendar en MY Psicoterapia. Estoy en la pantalla: ${pathname}`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return <div className={`floating-support${open ? " floating-support--open" : ""}`} ref={panelRef}>
    {open && <aside className="floating-support-panel" id="floating-support-panel" aria-label="Ayuda para agendar">
      <button className="floating-support-close" type="button" aria-label="Cerrar ayuda" onClick={() => setOpen(false)}>×</button>
      <p className="floating-support-eyebrow">SOPORTE TÉCNICO</p>
      <h2>¿Algo no está funcionando?</h2>
      <p>Escríbenos y cuéntanos en qué parte del proceso necesitas ayuda.</p>
      <a className="floating-support-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
        <Image src="/assets/whatsapp-icon-48.svg" alt="" width={20} height={20} />
        Abrir WhatsApp
      </a>
      <small>No es un canal de emergencias psicológicas.</small>
    </aside>}
    <button
      className="floating-support-trigger"
      type="button"
      aria-label={open ? "Cerrar ayuda" : "Abrir ayuda para agendar"}
      aria-controls={open ? "floating-support-panel" : undefined}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      <Image src="/assets/whatsapp-support.png" alt="" width={48} height={48} priority />
    </button>
  </div>;
}
