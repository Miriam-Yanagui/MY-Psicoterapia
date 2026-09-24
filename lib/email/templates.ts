type AppointmentEmailData = {
  appointmentId: string;
  startsAt: string;
  timezone: string;
  amountMinor: number;
  currency: string;
  patientEmail: string;
  patientPhone?: string | null;
  patientName?: string | null;
  emotion?: string | null;
  therapyExperience?: string | null;
  goals?: string[];
  goalsAdditionalNotes?: string | null;
  meetUrl: string;
};

export type TransactionalEmail = { subject: string; html: string; text: string };

const SITE_URL = "https://www.mypsicoterapia.com";
const THERAPY_AGREEMENT_URL = "https://www.jotform.com/es/sign/262517214446051/invite/01m2439fjs50a36a08c0937bb6";

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
  const html = `<!doctype html><html lang="es" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#f4eee5;font-family:Arial,sans-serif;color:#2d2d2d"><div lang="es" dir="ltr" style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><table lang="es" dir="ltr" role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4eee5"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff9f0;border-radius:24px;overflow:hidden"><tr><td style="height:14px;background:#e74824"></td></tr><tr><td style="padding:30px 34px 18px;text-align:center"><img src="${SITE_URL}/assets/email-celebration.gif" width="80" height="60" alt="Celebración" style="display:block;width:80px;height:60px;margin:0 auto 12px;border:0"><div style="color:#e74824;font-size:12px;font-weight:700;letter-spacing:2px">PSICO. MIRIAM YANAGUI</div><h1 style="margin:16px 0 0;font-family:Georgia,serif;font-size:34px;line-height:1.12;font-weight:400">${escapeHtml(title)}</h1></td></tr><tr><td style="padding:8px 34px 38px">${body}</td></tr><tr><td style="padding:20px 30px;background:#faf4e9;text-align:center;color:#6f5848;font-size:11px;line-height:1.7">Psicoterapia por videollamada · <a href="${SITE_URL}" style="color:#b83218">Visitar MY Psicoterapia</a><br><a href="${SITE_URL}/aviso-de-privacidad" style="color:#b83218">Aviso de privacidad</a> · <a href="${SITE_URL}/terminos" style="color:#b83218">Términos del servicio</a><br>Este correo contiene información de una reservación. No respondas con información clínica sensible.</td></tr></table></td></tr></table></body></html>`;
  return { subject: title, html, text: `${text}\n\nAviso de privacidad: ${SITE_URL}/aviso-de-privacidad\nTérminos del servicio: ${SITE_URL}/terminos` };
}

export function patientConfirmationEmail(data: AppointmentEmailData): TransactionalEmail {
  const detail = appointmentDetails(data);
  const meetAction = `<p style="margin:18px 0 0;text-align:center"><a href="${escapeHtml(data.meetUrl)}" style="display:inline-block;padding:13px 22px;border-radius:24px;background:#1a73e8;color:#fff;text-decoration:none;font-weight:700">Entrar a la sesión en Google Meet</a></p>`;
  const body = `<p style="margin:0 0 22px;text-align:center;font-size:15px;line-height:1.6">Recibimos tu pago y tu sesión quedó confirmada.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf4e9;border-radius:18px"><tr><td style="padding:24px"><div style="color:#b83218;font-size:11px;font-weight:700;letter-spacing:1.5px">RESUMEN DE TU CITA</div><p style="margin:13px 0 5px;font-size:19px;font-weight:700">${escapeHtml(detail.date)}</p><p style="margin:0 0 14px;font-size:15px">${escapeHtml(detail.time)} · Google Meet · 50 minutos</p><p style="margin:0;color:#6f5848;font-size:13px">Pago confirmado · ${escapeHtml(detail.price)} ${escapeHtml(data.currency)}</p><p style="margin:8px 0 0;color:#6f5848;font-size:11px">Reserva ${detail.reference}</p>${meetAction}</td></tr></table><h2 style="margin:27px 0 10px;font-size:17px">¿Qué sigue?</h2><ol style="margin:0;padding-left:22px;font-size:14px;line-height:1.7"><li>Guarda este correo como comprobante.</li><li>Firma el acuerdo de psicoterapia antes de tu primera sesión.</li><li>Revisa también la invitación de Google Calendar.</li><li>Conéctate a Google Meet cinco minutos antes.</li></ol><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;background:#f8e5d8;border:1px solid #efd1bf;border-radius:18px"><tr><td style="padding:21px 22px;text-align:center"><div style="color:#6f5848;font-size:12px;font-weight:700;letter-spacing:1px">ANTES DE TU PRIMERA SESIÓN</div><p style="margin:9px 0 17px;font-size:14px;line-height:1.5">Lee y firma el acuerdo de psicoterapia de forma segura.</p><a href="${THERAPY_AGREEMENT_URL}" style="display:inline-block;padding:14px 24px;border-radius:24px;background:#b83218;color:#fff;text-decoration:none;font-size:14px;font-weight:700">Firmar acuerdo de psicoterapia</a></td></tr></table><p style="margin:18px 0 0;text-align:center"><a href="https://wa.me/526243167794" style="display:inline-block;padding:13px 22px;border-radius:24px;background:#147a39;color:#fff;text-decoration:none;font-weight:700">Hablar con la Psico. Miriam</a></p>`;
  const text = `Tu sesión está confirmada\n\n${detail.date}\n${detail.time} · Google Meet · 50 minutos\nPago confirmado · ${detail.price} ${data.currency}\nReserva ${detail.reference}\nEnlace de Google Meet: ${data.meetUrl}\n\nAntes de tu primera sesión, firma el acuerdo de psicoterapia:\n${THERAPY_AGREEMENT_URL}\n\nRevisa también la invitación de Google Calendar. Conéctate cinco minutos antes.\n\nDudas: https://wa.me/526243167794`;
  return layout(`Cita confirmada para ${detail.date} a las ${detail.time}`, "Tu espacio está reservado.", body, text);
}

export function practitionerNoticeEmail(data: AppointmentEmailData): TransactionalEmail {
  const detail = appointmentDetails(data);
  const goals = data.goals?.length ? data.goals.map((goal) => `<li>${escapeHtml(goal)}</li>`).join("") : "<li>Sin respuesta</li>";
  const calendar = `<a href="${escapeHtml(data.meetUrl)}" style="color:#1a5fb4;font-weight:700">Abrir Google Meet de esta cita</a>`;
  const body = `<p style="margin:0 0 22px;text-align:center;font-size:15px;line-height:1.6">Se confirmó una nueva sesión pagada.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf4e9;border-radius:18px"><tr><td style="padding:24px"><div style="color:#b83218;font-size:11px;font-weight:700;letter-spacing:1.5px">NUEVA RESERVACIÓN</div><p style="margin:13px 0 5px;font-size:19px;font-weight:700">${escapeHtml(detail.date)}</p><p style="margin:0 0 14px;font-size:15px">${escapeHtml(detail.time)} · Google Meet · 50 minutos</p><p style="margin:0 0 7px;font-size:13px"><strong>Nombre:</strong> ${escapeHtml(data.patientName ?? "Sin nombre")}</p><p style="margin:0 0 7px;font-size:13px"><strong>Correo:</strong> ${escapeHtml(data.patientEmail)}</p><p style="margin:0 0 7px;font-size:13px"><strong>Teléfono:</strong> ${escapeHtml(data.patientPhone ?? "Sin teléfono")}</p><p style="margin:0;color:#6f5848;font-size:13px">Pago confirmado · ${escapeHtml(detail.price)} ${escapeHtml(data.currency)}</p><p style="margin:8px 0 0;color:#6f5848;font-size:11px">Reserva ${detail.reference}</p></td></tr></table><h2 style="margin:26px 0 10px;font-size:17px">Respuestas del onboarding</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff;border:1px solid #ead8c9;border-radius:16px"><tr><td style="padding:21px"><p style="margin:0 0 10px;font-size:13px"><strong>Cómo se ha sentido:</strong> ${escapeHtml(data.emotion ?? "Sin respuesta")}</p><p style="margin:0 0 10px;font-size:13px"><strong>Experiencia con terapia:</strong> ${escapeHtml(data.therapyExperience ?? "Sin respuesta")}</p><p style="margin:0 0 6px;font-size:13px"><strong>Objetivos:</strong></p><ul style="margin:0 0 12px;padding-left:20px;font-size:13px;line-height:1.6">${goals}</ul><p style="margin:0;font-size:13px;line-height:1.6"><strong>Notas adicionales:</strong><br>${escapeHtml(data.goalsAdditionalNotes ?? "Sin notas adicionales")}</p></td></tr></table><p style="margin:24px 0 0;font-size:13px;line-height:1.6">${calendar}</p>`;
  const textGoals = data.goals?.length ? data.goals.map((goal) => `- ${goal}`).join("\n") : "- Sin respuesta";
  const text = `Nueva sesión confirmada\n\n${detail.date}\n${detail.time} · Google Meet · 50 minutos\nNombre: ${data.patientName ?? "Sin nombre"}\nCorreo: ${data.patientEmail}\nTeléfono: ${data.patientPhone ?? "Sin teléfono"}\nPago confirmado · ${detail.price} ${data.currency}\nReserva ${detail.reference}\n\nRespuestas del onboarding\nCómo se ha sentido: ${data.emotion ?? "Sin respuesta"}\nExperiencia con terapia: ${data.therapyExperience ?? "Sin respuesta"}\nObjetivos:\n${textGoals}\nNotas adicionales: ${data.goalsAdditionalNotes ?? "Sin notas adicionales"}\n\nGoogle Meet: ${data.meetUrl}`;
  return layout(`Nueva reservación: ${detail.date} a las ${detail.time}`, "Nueva sesión confirmada.", body, text);
}
