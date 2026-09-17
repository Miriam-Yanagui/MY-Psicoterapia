"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "miriam_cookie_consent_v2";

type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

function saveConsent(analytics: boolean, marketing: boolean) {
  const preferences: ConsentPreferences = {
    necessary: true,
    analytics,
    marketing,
    updatedAt: new Date().toISOString(),
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* The notice may reappear if storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent("miriam:consent-updated", { detail: preferences }));
}

export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try { setVisible(!localStorage.getItem(STORAGE_KEY)); }
    catch { setVisible(true); }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [visible]);

  function choose(analyticsAllowed: boolean, marketingAllowed: boolean) {
    saveConsent(analyticsAllowed, marketingAllowed);
    setVisible(false);
  }

  if (!visible) return null;
  return <div className="cookie-consent-backdrop">
    <aside className="cookie-consent" aria-labelledby="cookie-consent-title" aria-modal="true" role="dialog">
      <span className="cookie-consent-handle" aria-hidden="true" />
      <div className="cookie-consent-topline">
        <span className="cookie-consent-icon" aria-hidden="true">🍪<i>✓</i></span>
        <span>Tus preferencias</span>
      </div>
      <h2 id="cookie-consent-title">Tú decides qué permites</h2>
      <p className="cookie-consent-intro">Usamos cookies necesarias para que la plataforma funcione. Con tu permiso, también podremos analizar el uso general y medir campañas para mejorar la experiencia.</p>
      <div className="cookie-consent-required"><span aria-hidden="true">🔒</span> Las cookies necesarias siempre están activas.</div>

      {configuring ? <div className="cookie-consent-preferences">
        <label><span><strong>Analítica</strong><small>Nos ayuda a conocer el uso general del sitio.</small></span><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
        <label><span><strong>Marketing</strong><small>Permite medir campañas publicitarias sin enviar respuestas clínicas.</small></span><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /></label>
        <button className="cookie-consent-primary" type="button" onClick={() => choose(analytics, marketing)}>Guardar preferencias</button>
        <button className="cookie-consent-secondary" type="button" onClick={() => setConfiguring(false)}>Volver</button>
      </div> : <div className="cookie-consent-actions">
        <button className="cookie-consent-primary" type="button" onClick={() => choose(true, true)}>Aceptar todas</button>
        <button className="cookie-consent-secondary" type="button" onClick={() => choose(false, false)}>Rechazar opcionales</button>
        <button className="cookie-consent-configure" type="button" onClick={() => setConfiguring(true)}><span aria-hidden="true">☷</span> Configurar preferencias</button>
      </div>}

      <p className="cookie-consent-footer">Puedes cambiar tu elección eliminando las preferencias guardadas en tu navegador.<br /><Link href="/aviso-de-privacidad#cookies">Ver política de cookies</Link></p>
    </aside>
  </div>;
}
