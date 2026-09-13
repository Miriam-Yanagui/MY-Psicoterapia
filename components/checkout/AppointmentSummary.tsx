import Image from "next/image";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function formatAppointment(date: string | null, time: string | null) {
  if (!date || !time) return "Horario pendiente";
  const [, month, day] = date.split("-").map(Number);
  return `${day} de ${MONTHS[month - 1]} · ${time}`;
}

export function AppointmentSummary({ date, time }: { date: string | null; time: string | null }) {
  return <div className="checkout-summary">
    <p className="checkout-summary-label">TU CITA</p>
    <p className="checkout-summary-date">{formatAppointment(date, time)}</p>
    <p className="checkout-summary-mode"><Image src="/assets/google-meet-lockup.svg" alt="Google Meet" width={108} height={14} /></p>
    <p className="checkout-summary-status">Lista para confirmar</p>
  </div>;
}
