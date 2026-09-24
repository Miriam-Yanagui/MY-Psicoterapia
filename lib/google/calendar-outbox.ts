import "server-only";

import { getGoogleOAuthConfig } from "@/lib/google/oauth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CalendarJob = { id: string; appointment_id: string; attempts: number };
type CalendarAppointment = {
  id: string;
  email: string | null;
  slot: { starts_at: string; ends_at: string; timezone: string } | { starts_at: string; ends_at: string; timezone: string }[];
};

type GoogleEvent = { id?: string; hangoutLink?: string; conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] } };

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function retryDelayMinutes(attempts: number): number {
  return Math.min(60, 2 ** Math.max(0, attempts - 1));
}

export function eventIdForAppointment(appointmentId: string): string {
  return `mpsi${appointmentId.replace(/-/g, "").toLowerCase()}`;
}

export function calendarEventBody(appointment: CalendarAppointment) {
  const slot = Array.isArray(appointment.slot) ? appointment.slot[0] : appointment.slot;
  if (!appointment.email || !slot) throw new Error("CONFIRMED_APPOINTMENT_INCOMPLETE");
  const eventId = eventIdForAppointment(appointment.id);
  return {
    id: eventId,
    summary: "Sesión privada · MY Psicoterapia",
    description: `Reservación ${appointment.id.replace(/-/g, "").slice(0, 10).toUpperCase()} confirmada en MY Psicoterapia.`,
    start: { dateTime: slot.starts_at, timeZone: slot.timezone },
    end: { dateTime: slot.ends_at, timeZone: slot.timezone },
    attendees: [{ email: appointment.email }],
    conferenceData: { createRequest: { requestId: eventId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
    extendedProperties: { private: { appointmentId: appointment.id } },
    reminders: { useDefault: true },
  };
}

async function accessToken(refreshToken: string): Promise<string> {
  const config = getGoogleOAuthConfig();
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as { access_token?: string; error?: string } | null;
  if (!response.ok || !payload?.access_token) throw new Error(`GOOGLE_TOKEN_${payload?.error ?? response.status}`);
  return payload.access_token;
}

function meetUrl(event: GoogleEvent): string | null {
  return event.hangoutLink
    ?? event.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === "video")?.uri
    ?? null;
}

async function createOrRecoverEvent(token: string, appointment: CalendarAppointment): Promise<{ eventId: string; meetUrl: string | null }> {
  const eventId = eventIdForAppointment(appointment.id);
  const endpoint = `${GOOGLE_CALENDAR_ENDPOINT}?conferenceDataVersion=1&sendUpdates=all`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(calendarEventBody(appointment)),
    cache: "no-store",
  });
  if (response.status === 409) {
    const existing = await fetch(`${GOOGLE_CALENDAR_ENDPOINT}/${eventId}?conferenceDataVersion=1`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
    });
    const event = await existing.json().catch(() => null) as GoogleEvent | null;
    if (!existing.ok || !event?.id) throw new Error(`GOOGLE_EVENT_RECOVERY_${existing.status}`);
    return { eventId: event.id, meetUrl: meetUrl(event) };
  }
  const event = await response.json().catch(() => null) as (GoogleEvent & { error?: { message?: string } }) | null;
  if (!response.ok || !event?.id) throw new Error(`GOOGLE_EVENT_${response.status}_${event?.error?.message ?? "UNKNOWN"}`);
  return { eventId: event.id, meetUrl: meetUrl(event) };
}

export async function processCalendarOutbox(limit = 4): Promise<{ created: number; failed: number }> {
  const supabase = createServerSupabaseClient();
  await supabase.from("calendar_outbox")
    .update({ status: "pending", next_attempt_at: new Date().toISOString(), last_error: "RECOVERED_STALE_WORKER" })
    .eq("status", "processing")
    .lt("updated_at", new Date(Date.now() - 10 * 60_000).toISOString())
    .lt("attempts", 6);

  const { data: pending, error } = await supabase.from("calendar_outbox")
    .select("id,appointment_id,attempts").eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString()).order("created_at", { ascending: true }).limit(limit);
  if (error) throw error;
  if (!pending?.length) return { created: 0, failed: 0 };

  const { data: credential, error: credentialError } = await supabase.from("google_oauth_credentials")
    .select("refresh_token").eq("id", "primary").maybeSingle();
  if (credentialError) throw credentialError;
  let token: string | null = null;
  let connectionError: string | null = null;
  if (!credential?.refresh_token) connectionError = "GOOGLE_CALENDAR_NOT_CONNECTED";
  else {
    try { token = await accessToken(credential.refresh_token); }
    catch (error) { connectionError = error instanceof Error ? error.message : "GOOGLE_TOKEN_FAILED"; }
  }
  if (!token) {
    for (const job of pending as CalendarJob[]) {
      const attempts = job.attempts + 1;
      await supabase.from("calendar_outbox").update({
        status: attempts >= 6 ? "failed" : "pending", attempts,
        next_attempt_at: new Date(Date.now() + retryDelayMinutes(attempts) * 60_000).toISOString(),
        last_error: connectionError,
      }).eq("id", job.id).eq("status", "pending");
    }
    return { created: 0, failed: pending.length };
  }

  let created = 0;
  let failed = 0;
  for (const candidate of pending as CalendarJob[]) {
    const { data: claimed } = await supabase.from("calendar_outbox")
      .update({ status: "processing", attempts: candidate.attempts + 1 })
      .eq("id", candidate.id).eq("status", "pending")
      .select("id,appointment_id,attempts").maybeSingle();
    if (!claimed) continue;
    const job = claimed as CalendarJob;
    try {
      const { data: appointment, error: appointmentError } = await supabase.from("appointments")
        .select("id,email,slot:slots!inner(starts_at,ends_at,timezone)")
        .eq("id", job.appointment_id).eq("status", "confirmed").single();
      if (appointmentError) throw appointmentError;
      const event = await createOrRecoverEvent(token, appointment as unknown as CalendarAppointment);
      await supabase.from("calendar_outbox").update({
        status: "created", google_event_id: event.eventId, meet_url: event.meetUrl,
        created_event_at: new Date().toISOString(), last_error: null,
      }).eq("id", job.id);
      created += 1;
    } catch (calendarError) {
      const terminal = job.attempts >= 6;
      await supabase.from("calendar_outbox").update({
        status: terminal ? "failed" : "pending",
        next_attempt_at: new Date(Date.now() + retryDelayMinutes(job.attempts) * 60_000).toISOString(),
        last_error: (calendarError instanceof Error ? calendarError.message : "CALENDAR_CREATE_FAILED").slice(0, 300),
      }).eq("id", job.id);
      failed += 1;
    }
  }
  return { created, failed };
}
