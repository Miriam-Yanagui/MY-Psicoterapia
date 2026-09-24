import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { calendarEventBody, eventIdForAppointment } from "./calendar-outbox";

const appointment = {
  id: "7195892a-6797-4891-a524-7033e84018e1",
  email: "persona@example.com",
  slot: { starts_at: "2026-10-01T18:00:00Z", ends_at: "2026-10-01T18:50:00Z", timezone: "America/Mexico_City" },
};

describe("Google Calendar event", () => {
  it("uses a deterministic Google-safe id so retries cannot duplicate the event", () => {
    expect(eventIdForAppointment(appointment.id)).toBe("mpsi7195892a67974891a5247033e84018e1");
    expect(eventIdForAppointment(appointment.id)).toBe(eventIdForAppointment(appointment.id));
  });

  it("creates the exact slot, attendee and Meet request", () => {
    expect(calendarEventBody(appointment)).toMatchObject({
      summary: "Sesión privada · MY Psicoterapia",
      start: { dateTime: "2026-10-01T18:00:00Z", timeZone: "America/Mexico_City" },
      end: { dateTime: "2026-10-01T18:50:00Z", timeZone: "America/Mexico_City" },
      attendees: [{ email: "persona@example.com" }, { email: "myterapiacc@gmail.com" }],
      guestsCanInviteOthers: false,
      guestsCanModify: false,
      guestsCanSeeOtherGuests: false,
      conferenceData: { createRequest: { conferenceSolutionKey: { type: "hangoutsMeet" } } },
    });
  });
});
