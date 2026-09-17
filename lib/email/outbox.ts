import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { patientConfirmationEmail, practitionerNoticeEmail } from "@/lib/email/templates";

type OutboxJob = {
  id: string;
  appointment_id: string;
  kind: "patient_confirmation" | "practitioner_notice";
  recipient: string | null;
  attempts: number;
};

type AppointmentRow = {
  id: string;
  email: string | null;
  amount_minor: number;
  currency: string;
  slot: { starts_at: string; timezone: string } | { starts_at: string; timezone: string }[];
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function retryDelayMinutes(attempts: number): number {
  return Math.min(60, 2 ** Math.max(0, attempts - 1));
}

export async function processEmailOutbox(limit = 4): Promise<{ sent: number; failed: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: 0, failed: 0 };

  const supabase = createServerSupabaseClient();
  await supabase
    .from("email_outbox")
    .update({ status: "pending", next_attempt_at: new Date().toISOString(), last_error: "RECOVERED_STALE_WORKER" })
    .eq("status", "processing")
    .lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .lt("attempts", 6);
  const { data: pending, error } = await supabase
    .from("email_outbox")
    .select("id,appointment_id,kind,recipient,attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const candidate of (pending ?? []) as OutboxJob[]) {
    const { data: claimed } = await supabase
      .from("email_outbox")
      .update({ status: "processing", attempts: candidate.attempts + 1 })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("id,appointment_id,kind,recipient,attempts")
      .maybeSingle();
    if (!claimed) continue;
    const job = claimed as OutboxJob;

    try {
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select("id,email,amount_minor,currency,slot:slots!inner(starts_at,timezone)")
        .eq("id", job.appointment_id)
        .eq("status", "confirmed")
        .single();
      if (appointmentError) throw appointmentError;
      const row = appointment as unknown as AppointmentRow;
      const slot = Array.isArray(row.slot) ? row.slot[0] : row.slot;
      if (!row.email || !slot) throw new Error("CONFIRMED_APPOINTMENT_INCOMPLETE");

      const recipient = job.kind === "patient_confirmation"
        ? job.recipient ?? row.email
        : process.env.MIRIAM_NOTIFICATION_EMAIL ?? "hola@mypsicoterapia.com";
      const email = (job.kind === "patient_confirmation" ? patientConfirmationEmail : practitionerNoticeEmail)({
        appointmentId: row.id,
        startsAt: slot.starts_at,
        timezone: slot.timezone,
        amountMinor: row.amount_minor,
        currency: row.currency,
        patientEmail: row.email,
      });

      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `miriam-outbox-${job.id}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? "Psico. Miriam Yanagui <hola@mypsicoterapia.com>",
          to: [recipient],
          reply_to: process.env.RESEND_REPLY_TO_EMAIL ?? "hola@mypsicoterapia.com",
          subject: email.subject,
          html: email.html,
          text: email.text,
          tags: [{ name: "email_kind", value: job.kind }],
        }),
      });
      const payload = await response.json().catch(() => null) as { id?: string; message?: string } | null;
      if (!response.ok || !payload?.id) throw new Error(`RESEND_${response.status}_${payload?.message ?? "UNKNOWN"}`);

      await supabase.from("email_outbox").update({
        status: "sent", provider_message_id: payload.id, sent_at: new Date().toISOString(), last_error: null,
      }).eq("id", job.id);
      sent += 1;
    } catch (sendError) {
      const attempts = job.attempts;
      const terminal = attempts >= 6;
      await supabase.from("email_outbox").update({
        status: terminal ? "failed" : "pending",
        next_attempt_at: new Date(Date.now() + retryDelayMinutes(attempts) * 60_000).toISOString(),
        last_error: (sendError instanceof Error ? sendError.message : "EMAIL_SEND_FAILED").slice(0, 300),
      }).eq("id", job.id);
      failed += 1;
    }
  }
  return { sent, failed };
}
