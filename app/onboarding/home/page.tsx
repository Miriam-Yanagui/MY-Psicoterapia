"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { MobileScreen } from "@/components/ui/MobileScreen";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { routes } from "@/lib/flow";

export default function HomePage() {
  const router = useRouter();
  return <MobileScreen className="f01">
    <Image className="f01-photo" src="/assets/f01-miriam-home.png" alt="Miriam Yanagui" width={390} height={693} priority />
    <svg className="f01-curve" viewBox="0 0 390 844" aria-hidden="true"><path fill="#FAF4E9" d="M0,438.9219055175781C85,438.9219055175781,120,407,195,407C270,407,305,438.9219055175781,390,438.9219055175781L390,844L0,844Z" /></svg>
    <Image className="f01-logo" src="/assets/f01-logo-my-naranja.png" alt="" width={42} height={30} />
    <p className="f01-eyebrow">TERAPIA POR VIDEOLLAMADA</p><span className="f01-accent" />
    <h1 className="f01-title">Un espacio para<br/><span>comprenderte</span><br/>y comenzar a<br/>generar cambios.</h1>
    <PrimaryButton className="f01-button" onClick={() => router.push(routes.name)}>Comenzar</PrimaryButton>
    <p className="f01-aux">4 preguntas · menos de 1 minuto · para agendar</p>
    <p className="f01-payment">Pago con tarjeta · <strong>$800 MXN</strong> · 50 minutos</p>
  </MobileScreen>;
}
