import { describe, expect, it } from "vitest";
import { patientConfirmationEmail, practitionerNoticeEmail } from "./templates";

const appointment = {
  appointmentId: "12345678-abcd-4000-8000-123456789abc",
  startsAt: "2026-09-24T15:00:00.000Z",
  timezone: "America/Mexico_City",
  amountMinor: 80000,
  currency: "MXN",
  patientEmail: "persona@example.com",
};

describe("transactional email templates", () => {
  it("renders the patient booking details in HTML and plain text", () => {
    const email = patientConfirmationEmail(appointment);
    expect(email.subject).toBe("Tu espacio está reservado.");
    expect(email.html).toContain("$800");
    expect(email.html).toContain("Reserva 12345678AB");
    expect(email.text).toContain("Google Meet · 50 minutos");
  });

  it("escapes patient data in the practitioner email", () => {
    const email = practitionerNoticeEmail({ ...appointment, patientEmail: "a<script>@example.com" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("a&lt;script&gt;@example.com");
    expect(email.text).toContain("a<script>@example.com");
  });
});
