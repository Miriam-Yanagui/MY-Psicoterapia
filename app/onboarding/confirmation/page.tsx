"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { recoverCurrentBooking } from "@/lib/booking";
import { routes } from "@/lib/flow";
import { isAuthoritativelyConfirmed } from "@/lib/confirmation";

export default function ConfirmationPage() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    let active = true;
    void recoverCurrentBooking().then((booking) => {
      if (!active) return;
      if (isAuthoritativelyConfirmed(booking)) setConfirmed(true);
      else router.replace(booking ? routes.checkout : routes.schedule);
    }).catch(() => router.replace(routes.checkout));
    return () => { active = false; };
  }, [router]);
  return <MobileScreen className="f12">
    <BrandMark /><div className="cream-watermark" aria-hidden="true" />
    <section className="f12-card"><p className="f12-eyebrow">{confirmed ? "CITA CONFIRMADA" : "VERIFICANDO CITA"}</p>
      <div className="f12-check" aria-hidden="true">{confirmed ? "✓" : "…"}</div>
      <h1>{confirmed ? "Tu espacio está reservado." : "Verificando tu cita…"}</h1>
      <p>{confirmed ? "Recibimos tu pago y confirmamos tu sesión con Miriam." : "Espera un momento mientras comprobamos la confirmación."}</p>
    </section>
  </MobileScreen>;
}
