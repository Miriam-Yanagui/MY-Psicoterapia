type AppointmentEmailData = {
  appointmentId: string;
  startsAt: string;
  timezone: string;
  amountMinor: number;
  currency: string;
  patientEmail: string;
};

export type TransactionalEmail = { subject: string; html: string; text: string };

const SITE_URL = "https://www.mypsicoterapia.com";

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function appointmentDetails(data: AppointmentEmailData) {
  const instant = new Date(data.startsAt);
  const date = new Intl.DateTimeFormat("es-MX", {
    timeZone: data.timezone, weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(instant);
  const time = new Intl.DateTimeFormat("es-MX", {
    timeZone: data.timezone, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(instant).replace(/a\.\s*m\./i, "a.m.").replace(/p\.\s*m\./i, "p.m.");
  return {
    date: date.charAt(0).toUpperCase() + date.slice(1),
    time,
    price: new Intl.NumberFormat("es-MX", { style: "currency", currency: data.currency, maximumFractionDigits: 0 }).format(data.amountMinor / 100),
    reference: data.appointmentId.replace(/-/g, "").slice(0, 10).toUpperCase(),
  };
}

function layout(preheader: string, title: string, body: string, text: string): TransactionalEmail {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#f4eee5;font-family:Arial,sans-serif;color:#2d2d2d"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4eee5"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff9f0;border-radius:24px;overflow:hidden"><tr><td style="height:14px;background:#e74824"></td></tr><tr><td style="padding:38px 34px 18px;text-align:center"><div style="color:#e74824;font-size:12px;font-weight:700;letter-spacing:2px">PSICO. MIRIAM YANAGUI</div><h1 style="margin:16px 0 0;font-family:Georgia,serif;font-size:34px;line-height:1.12;font-weight:400">${escapeHtml(title)}</h1></td></tr><tr><td style="padding:8px 34px 38px">${body}</td></tr><tr><td style="padding:20px 30px;background:#faf4e9;text-align:center;color:#8a6f5c;font-size:11px;line-height:1.5">Psicoterapia por videollamada · <a href="${SITE_URL}" style="color:#e74824">mypsicoterapia.com</a><br>Este correo contiene información de una reservación. No respondas con información clínica sensible.</td></tr></table></td></tr></table></body></html>`;
  return { subject: title, html, text };
}

export function patientConfirmationEmail(data: AppointmentEmailData): TransactionalEmail {
  const detail = appointmentDetails(data);
  const body = `<p style="margin:0 0 22px;text-align:center;font-size:15px;line-height:1.6">Recibimos tu pago y tu sesión quedó confirmada.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf4e9;border-radius:18px"><tr><td style="padding:24px"><div style="color:#e74824;font-size:11px;font-weight:700;letter-spacing:1.5px">RESUMEN DE TU CITA</div><p style="margin:13px 0 5px;font-size:19px;font-weight:700">${escapeHtml(detail.date)}</p><p style="margin:0 0 14px;font-size:15px">${escapeHtml(detail.time)} · Google Meet · 50 minutos</p><p style="margin:0;color:#8a6f5c;font-size:13px">Pago confirmado · ${escapeHtml(detail.price)} ${escapeHtml(data.currency)}</p><p style="margin:8px 0 0;color:#8a6f5c;font-size:11px">Reserva ${detail.reference}</p></td></tr></table><h2 style="margin:27px 0 10px;font-size:17px">¿Qué sigue?</h2><ol style="margin:0;padding-left:22px;font-size:14px;line-height:1.7"><li>Guarda este correo como comprobante.</li><li>La Psico. Miriam Yanagui compartirá los detalles de acceso por correo.</li><li>Conéctate a Google Meet cinco minutos antes.</li></ol><p style="margin:26px 0 0;text-align:center"><a href="https://wa.me/526243167794" style="display:inline-block;padding:13px 22px;border-radius:24px;background:#25d366;color:#fff;text-decoration:none;font-weight:700">Hablar con la Psico. Miriam</a></p>`;
  const text = `Tu sesión está confirmada\n\n${detail.date}\n${detail.time} · Google Meet · 50 minutos\nPago confirmado · ${detail.price} ${data.currency}\nReserva ${detail.reference}\n\nLa Psico. Miriam Yanagui compartirá los detalles de acceso por correo. Conéctate cinco minutos antes.\n\nDudas: https://wa.me/526243167794`;
  return layout(`Cita confirmada para ${detail.date} a las ${detail.time}`, "Tu espacio está reservado.", body, text);
}

export function practitionerNoticeEmail(data: AppointmentEmailData): TransactionalEmail {
  const detail = appointmentDetails(data);
  const body = `<p style="margin:0 0 22px;text-align:center;font-size:15px;line-height:1.6">Se confirmó una nueva sesión pagada.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf4e9;border-radius:18px"><tr><td style="padding:24px"><div style="color:#e74824;font-size:11px;font-weight:700;letter-spacing:1.5px">NUEVA RESERVACIÓN</div><p style="margin:13px 0 5px;font-size:19px;font-weight:700">${escapeHtml(detail.date)}</p><p style="margin:0 0 14px;font-size:15px">${escapeHtml(detail.time)} · Google Meet · 50 minutos</p><p style="margin:0 0 7px;font-size:13px"><strong>Paciente:</strong> ${escapeHtml(data.patientEmail)}</p><p style="margin:0;color:#8a6f5c;font-size:13px">Pago confirmado · ${escapeHtml(detail.price)} ${escapeHtml(data.currency)}</p><p style="margin:8px 0 0;color:#8a6f5c;font-size:11px">Reserva ${detail.reference}</p></td></tr></table><p style="margin:24px 0 0;font-size:13px;line-height:1.6">Prepara y comparte el enlace de Google Meet con la persona antes de la sesión.</p>`;
  const text = `Nueva sesión confirmada\n\n${detail.date}\n${detail.time} · Google Meet · 50 minutos\nPaciente: ${data.patientEmail}\nPago confirmado · ${detail.price} ${data.currency}\nReserva ${detail.reference}\n\nPrepara y comparte el enlace de Google Meet antes de la sesión.`;
  return layout(`Nueva reservación: ${detail.date} a las ${detail.time}`, "Nueva sesión confirmada.", body, text);
}
