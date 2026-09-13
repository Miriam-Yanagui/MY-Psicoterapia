"use client";

import { useMemo, useState } from "react";

const Shield = () => <svg className="checkout-shield" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M208 40H48a16 16 0 0 0-16 16v56c0 108.07 91.09 143.82 91.09 143.82a13.8 13.8 0 0 0 9.82 0S224 220.07 224 112V56a16 16 0 0 0-16-16Zm0 72c0 82.54-62.35 117.86-80 126.45C110.35 229.86 48 194.54 48 112V56h160Zm-101.66 37.66a8 8 0 0 1 11.32-11.32L128 148.69l26.34-26.35a8 8 0 0 1 11.32 11.32l-32 32a8 8 0 0 1-11.32 0Z" /></svg>;

function PaymentField({ className, label, placeholder, value, onChange, inputMode }: { className: string; label: string; placeholder: string; value: string; onChange: (value: string) => void; inputMode?: "numeric" }) {
  const id = `payment-${className}`;
  return <div className={`checkout-payment-field ${className}`}><label htmlFor={id}>{label}</label><input id={id} type="text" inputMode={inputMode} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

export function PaymentSection() {
  const [cardNumber, setCardNumber] = useState("");
  const [expiration, setExpiration] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [cardholder, setCardholder] = useState("");
  const [document, setDocument] = useState("");
  const valid = useMemo(() => cardNumber.replace(/\D/g, "").length >= 13 && /^\d{2}\/\d{2}$/.test(expiration) && /^\d{3,4}$/.test(securityCode) && cardholder.trim().length >= 3 && document.trim().length >= 3, [cardNumber, expiration, securityCode, cardholder, document]);

  return <><p className="checkout-expansion-intro">Completa tus datos de pago para confirmar tu sesión.</p><section className="checkout-brick" aria-labelledby="payment-title">
    <h2 id="payment-title">Tarjeta de crédito o débito</h2>
    <div className="checkout-brands" aria-label="Métodos aceptados"><span className="checkout-brand checkout-visa">VISA</span><span className="checkout-brand checkout-mastercard" aria-label="Mastercard" /><span className="checkout-brand checkout-amex">AMEX</span></div>
    <PaymentField className="checkout-card-number" label="Número de tarjeta" placeholder="1234 1234 1234 1234" value={cardNumber} onChange={(value) => setCardNumber(value.replace(/[^0-9 ]/g, ""))} inputMode="numeric" />
    <PaymentField className="checkout-expiration" label="Vencimiento" placeholder="MM/AA" value={expiration} onChange={(value) => setExpiration(value.replace(/[^0-9/]/g, ""))} inputMode="numeric" />
    <PaymentField className="checkout-security-code" label="Código de seguridad" placeholder="Ej.: 123" value={securityCode} onChange={(value) => setSecurityCode(value.replace(/\D/g, ""))} inputMode="numeric" />
    <PaymentField className="checkout-cardholder" label="Nombre del titular" placeholder="Como aparece en la tarjeta" value={cardholder} onChange={setCardholder} />
    <PaymentField className="checkout-document" label="Documento" placeholder="Selecciona e ingresa tu documento" value={document} onChange={setDocument} />
    <button className="checkout-pay" type="button" disabled={!valid}><Shield />Pagar $800 MXN</button>
    <p className="checkout-security">Pago seguro procesado por Mercado Pago</p>
  </section></>;
}
