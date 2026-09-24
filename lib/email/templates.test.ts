import { describe, expect, it } from "vitest";
import { patientConfirmationEmail, practitionerNoticeEmail } from "./templates";

const appointment = {
  appointmentId: "12345678-abcd-4000-8000-123456789abc",
  startsAt: "2026-09-24T15:00:00.000Z",
  timezone: "America/Mexico_City",
  amountMinor: 80000,
  currency: "MXN",
  patientEmail: "persona@example.com",
  meetUrl: "https://meet.google.com/xyz-abcd-efg",
};

describe("transactional email templates", () => {
  it("renders the patient booking details in HTML and plain text", () => {
    const email = patientConfirmationEmail(appointment);
    expect(email.subject).toBe("Tu espacio está reservado.");
    expect(email.html).toContain("/assets/email-celebration.gif");
    expect(email.html).toContain("$800");
    expect(email.html).toContain("Reserva 12345678AB");
    expect(email.html).toContain("Firmar acuerdo de psicoterapia");
    expect(email.html).toContain("jotform.com/es/sign/262517214446051");
    expect(email.text).toContain("Google Meet · 50 minutos");
    expect(email.html).toContain("https://meet.google.com/xyz-abcd-efg");
    expect(email.html).toContain("/aviso-de-privacidad");
    expect(email.html).toContain("/terminos");
    expect(email.text).toContain("Aviso de privacidad:");
    expect(email.text).toContain("jotform.com/es/sign/262517214446051");
  });

  it("escapes patient data in the practitioner email", () => {
    const email = practitionerNoticeEmail({
      ...appointment,
      patientEmail: "a<script>@example.com",
      patientPhone: "+525512345678",
      patientName: "Ana <Paciente>",
      emotion: "Preocupado/a",
      therapyExperience: "Primera vez",
      goals: ["Sentirme con más calma", "Conocerme mejor"],
      goalsAdditionalNotes: "Necesito <apoyo>",
      meetUrl: "https://meet.google.com/abc-defg-hij",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("a&lt;script&gt;@example.com");
    expect(email.html).toContain("Ana &lt;Paciente&gt;");
    expect(email.html).toContain("Necesito &lt;apoyo&gt;");
    expect(email.html).toContain("Sentirme con más calma");
    expect(email.html).toContain("https://meet.google.com/abc-defg-hij");
    expect(email.html).toContain('<html lang="es" dir="ltr">');
    expect(email.html).toContain("<title>Nueva sesión confirmada.</title>");
    expect(email.text).toContain("a<script>@example.com");
    expect(email.text).toContain("Preocupado/a");
  });
});
