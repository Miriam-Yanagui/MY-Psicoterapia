const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatDate(date: string | null) {
  if (!date) return "Fecha pendiente";
  const [, month, day] = date.split("-").map(Number);
  return `${day} de ${MONTHS[month - 1]}`;
}

function formatTime(time: string | null) {
  if (!time) return "Hora pendiente";
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "p.m." : "a.m.";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function compactReference(appointmentId: string) {
  return appointmentId.replace(/-/g, "").slice(0, 10).toUpperCase();
}

export function AppointmentSummary({ date, time, appointmentId, amountMinor, currency }: {
  date: string | null;
  time: string | null;
  appointmentId: string;
  amountMinor: number;
  currency: "MXN";
}) {
  const reference = compactReference(appointmentId);
  const bars = Array.from(reference).flatMap((character, index) => {
    const value = character.charCodeAt(0) + index;
    return [1 + value % 3, 1 + (value >> 2) % 2, 1 + (value >> 3) % 4];
  });

  return <article className="checkout-ticket" aria-label="Resumen de la cita">
    <div className="checkout-ticket-stripes" aria-hidden="true" />
    <p className="checkout-ticket-kicker">TU RESERVACIÓN</p>
    <h1>Tu sesión está<br />casi lista.</h1>
    <div className="checkout-ticket-rule" />
    <dl className="checkout-ticket-grid">
      <div><dt>FECHA</dt><dd>{formatDate(date)}</dd></div>
      <div><dt>HORA</dt><dd>{formatTime(time)}</dd></div>
      <div><dt>ESPECIALISTA</dt><dd>Psicóloga Miriam Yanagui</dd></div>
      <div><dt>MODALIDAD</dt><dd><span className="checkout-meet-mark" aria-hidden="true">▰</span> Google Meet</dd></div>
      <div><dt>DURACIÓN</dt><dd>50 minutos</dd></div>
      <div><dt>TOTAL</dt><dd className="checkout-ticket-total">${(amountMinor / 100).toLocaleString("es-MX")} {currency}</dd></div>
    </dl>
    <div className="checkout-ticket-rule checkout-ticket-rule--lower" />
    <p className="checkout-card-payment">▣ &nbsp;Pago seguro con tarjeta</p>
    <div className="checkout-barcode" aria-hidden="true">
      {bars.map((width, index) => <i key={index} style={{ width }} />)}
    </div>
    <p className="checkout-booking-reference">RESERVA · {reference}</p>
    <div className="checkout-ticket-stripes checkout-ticket-stripes--bottom" aria-hidden="true" />
  </article>;
}
