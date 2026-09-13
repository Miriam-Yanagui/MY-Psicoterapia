export function ConsentField({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="checkout-consent"><input className="checkout-check" type="checkbox" required checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className="checkout-consent-label">Acepto términos y aviso de privacidad.</span><span className="checkout-consent-note">Requerido para reservar.</span></label>;
}
