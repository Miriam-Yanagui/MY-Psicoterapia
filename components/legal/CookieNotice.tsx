"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "miriam_cookie_notice_v1";

export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { setVisible(localStorage.getItem(STORAGE_KEY) !== "acknowledged"); }
    catch { setVisible(true); }
  }, []);

  function acknowledge() {
    try { localStorage.setItem(STORAGE_KEY, "acknowledged"); } catch { /* The notice may reappear if storage is unavailable. */ }
    setVisible(false);
  }

  if (!visible) return null;
  return <aside className="cookie-notice" aria-label="Aviso de cookies" role="dialog" aria-live="polite">
    <span className="cookie-notice-emoji" aria-hidden="true">🍪</span>
    <div className="cookie-notice-copy">
      <strong>Tu reserva, bien cuidada.</strong>
      <p>Usamos únicamente una cookie indispensable para mantener segura tu reserva. No usamos cookies publicitarias.</p>
      <Link href="/aviso-de-privacidad#cookies">Ver aviso de privacidad</Link>
    </div>
    <button type="button" onClick={acknowledge}>Entendido</button>
  </aside>;
}
