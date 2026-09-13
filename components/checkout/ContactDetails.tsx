import Image from "next/image";
import type { Dispatch } from "react";
import type { OnboardingAction, OnboardingState } from "@/lib/types";

const Envelope = () => <svg className="checkout-envelope" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M224 48H32a8 8 0 0 0-8 8v136a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a8 8 0 0 0-8-8Zm-20.57 16L128 133.15 52.57 64ZM216 192H40V74.19l82.59 75.71a8 8 0 0 0 10.82 0L216 74.19Z" /></svg>;
const CheckCircle = () => <svg className="checkout-checkcircle" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M173.66 98.34a8 8 0 0 1 0 11.32l-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L112 148.69l50.34-50.35a8 8 0 0 1 11.32 0ZM232 128A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104Zm-16 0a88 88 0 1 0-88 88 88.1 88.1 0 0 0 88-88Z" /></svg>;

export function ContactDetails({ contact, dispatch }: { contact: OnboardingState["contact"]; dispatch: Dispatch<OnboardingAction> }) {
  return <>
    <div className="checkout-channel checkout-email">
      <span className="checkout-icon-bg" /><Envelope />
      <p className="checkout-channel-name">Correo</p><p className="checkout-channel-use">Meet y confirmaciones</p><CheckCircle />
      <label className="sr-only" htmlFor="checkout-email">Correo electrónico</label>
      <input id="checkout-email" className="checkout-input checkout-email-input" type="email" required autoComplete="email" placeholder="tu@email.com" value={contact.email} onChange={(event) => dispatch({ type: "setContactEmail", email: event.target.value })} />
    </div>
    <div className="checkout-channel checkout-whatsapp">
      <span className="checkout-icon-bg" /><Image className="checkout-whatsapp-icon" src="/assets/whatsapp-icon-48.svg" alt="" width={24} height={24} />
      <p className="checkout-channel-name">WhatsApp</p><p className="checkout-channel-use">Confirmación y recordatorios</p><p className="checkout-required">OBLIGATORIO</p>
      <div className="checkout-country-wrap"><label className="checkout-country-label" htmlFor="checkout-country">LADA</label><select id="checkout-country" className="checkout-country" required value={contact.countryCode} onChange={(event) => dispatch({ type: "setContactCountryCode", countryCode: event.target.value })}><option value="+52">+52</option><option value="+1">+1</option><option value="+34">+34</option><option value="+57">+57</option></select></div>
      <label className="sr-only" htmlFor="checkout-phone">Número de WhatsApp</label>
      <input id="checkout-phone" className="checkout-input checkout-phone-input" type="tel" required inputMode="numeric" autoComplete="tel-national" placeholder="Número de WhatsApp" value={contact.phone} onChange={(event) => dispatch({ type: "setContactPhone", phone: event.target.value.replace(/[^0-9 ()+-]/g, "") })} />
    </div>
  </>;
}
