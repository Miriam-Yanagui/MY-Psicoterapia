"use client";

import { CardPayment, initMercadoPago } from "@mercadopago/sdk-react";
import { useCallback, useMemo, useRef, useState, type Ref } from "react";
import { submitCardPayment, type SafePaymentStatus } from "@/lib/payment";

const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
if (publicKey) initMercadoPago(publicKey, { locale: "es-MX" });

const statusCopy: Record<SafePaymentStatus, string> = {
  processing: "Estamos procesando tu pago. No cierres esta ventana.",
  pending: "Tu pago está pendiente. Conservaremos el estado de tu solicitud.",
  approved_provisional: "Recibimos el pago. Estamos esperando la confirmación definitiva.",
  approved: "Tu pago fue confirmado. Estamos preparando los detalles de tu cita.",
  rejected: "El pago fue rechazado. Puedes intentarlo nuevamente mientras tu reserva siga vigente.",
};

export function PaymentSection({ amountMinor, currency, status: initialStatus, onBookingUnavailable, onBrickReady, sectionRef }: {
  amountMinor: number; currency: "MXN"; status?: SafePaymentStatus; onBookingUnavailable?: () => void; onBrickReady?: () => void; sectionRef?: Ref<HTMLElement>;
}) {
  const [status, setStatus] = useState<SafePaymentStatus | undefined>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const attemptKey = useRef(crypto.randomUUID());
  const initialization = useMemo(() => ({ amount: amountMinor / 100 }), [amountMinor]);
  const customization = useMemo(() => ({ paymentMethods: { types: { included: ["credit_card", "debit_card", "prepaid_card"] as Array<"credit_card" | "debit_card" | "prepaid_card"> } } }), []);
  const displayedStatus = initialStatus === "approved" ? "approved" : status ?? initialStatus;
  const handleSubmit = useCallback(async (form: { token: string; payment_method_id: string; installments: number }, additional?: { paymentTypeId?: string }) => {
    setError(null); setStatus("processing");
    try {
      const result = await submitCardPayment({ token: form.token, paymentMethodId: form.payment_method_id,
        paymentTypeId: additional?.paymentTypeId === "debit_card" || additional?.paymentTypeId === "prepaid_card" ? additional.paymentTypeId : "credit_card",
        installments: form.installments }, attemptKey.current);
      setStatus(result.status);
      if (result.status === "rejected") attemptKey.current = crypto.randomUUID();
    } catch (requestError) {
      const code = requestError instanceof Error && "code" in requestError ? String((requestError as { code: string }).code) : "";
      if (code === "HOLD_EXPIRED" || code === "BOOKING_NOT_ACTIVE" || code === "BOOKING_NOT_FOUND") {
        onBookingUnavailable?.();
        return;
      }
      setError("No pudimos comprobar el resultado. Reintenta; no crearemos un cobro nuevo.");
      setStatus("processing");
    }
  }, []);
  const handleError = useCallback(() => setError("No pudimos cargar el formulario seguro de Mercado Pago."), []);

  return <section ref={sectionRef} className="checkout-payment-flow" aria-label="Pago seguro con Mercado Pago">
    <div className="checkout-brick">
      {!publicKey ? <p className="checkout-payment-status" role="alert">El pago no está configurado.</p> : <CardPayment
        initialization={initialization} locale="es-MX" customization={customization}
        onSubmit={handleSubmit} onReady={onBrickReady} onError={handleError}
      />}
      {displayedStatus && <p className={`checkout-payment-status checkout-payment-status--${displayedStatus}`} role="status">{statusCopy[displayedStatus]}</p>}
      {error && <p className="checkout-payment-status checkout-payment-status--error" role="alert">{error}</p>}
      <p className="checkout-security">Pago de ${(amountMinor / 100).toFixed(0)} {currency} procesado por Mercado Pago</p>
    </div>
  </section>;
}
