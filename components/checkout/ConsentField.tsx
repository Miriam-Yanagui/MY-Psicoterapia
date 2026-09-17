import Link from "next/link";

export function ConsentField({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="checkout-consent"><input className="checkout-check" type="checkbox" required checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="checkout-consent-label">Acepto los <Link href="/terminos" target="_blank">términos</Link> y el <Link href="/aviso-de-privacidad" target="_blank">aviso de privacidad</Link>.</span><span className="checkout-consent-note">Requerido para reservar.</span></label>;
}
