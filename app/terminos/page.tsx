import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos del servicio | MY Psicoterapia",
  description: "Consulta las condiciones de las sesiones de psicoterapia en línea, incluidos honorarios, pagos, cancelaciones y confidencialidad.",
  alternates: { canonical: "/terminos" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "article",
    locale: "es_MX",
    url: "/terminos",
    siteName: "MY Psicoterapia",
    title: "Términos del servicio | MY Psicoterapia",
    description: "Condiciones aplicables a las sesiones de psicoterapia en línea de MY Psicoterapia.",
  },
};

export default function TermsPage() {
  return <LegalPage eyebrow="ANTES DE TU SESIÓN" title="Términos del servicio" updated="17 de septiembre de 2026">
    <h2>Partes</h2>
    <p>Este acuerdo se celebra entre la <strong>Psico. Miriam Yanagui</strong>, en lo sucesivo «la terapeuta», y la persona que reserva y recibe la sesión, en lo sucesivo «el paciente». Al marcar la casilla de aceptación y continuar con el pago, el paciente manifiesta que leyó y acepta estos términos.</p>

    <h2>Alcance del sitio</h2>
    <p>El recorrido inicial ayuda a organizar una reservación. Sus mensajes son informativos: no constituyen diagnóstico, evaluación clínica, consejo médico ni atención psicológica de emergencia. La relación terapéutica y sus alcances se explicarán directamente durante el proceso profesional.</p>

    <h2>1. Honorarios y pago</h2>
    <p>El honorario es de <strong>$800 MXN (ochocientos pesos mexicanos)</strong> por cada sesión de psicoterapia. El pago se realiza mediante la plataforma para confirmar el horario seleccionado. La cita queda confirmada únicamente después de que el proveedor de pagos autoriza la operación.</p>

    <h2>2. Cancelación y reprogramación</h2>
    <p>Las cancelaciones o solicitudes de reprogramación deberán realizarse con al menos <strong>24 horas de anticipación</strong>. Las cancelaciones fuera de ese plazo pueden conllevar el cobro de la sesión. Para solicitar un cambio, cancelar o aclarar un cobro, comunícate cuanto antes por WhatsApp al <a href="https://wa.me/526243167794">+52 624 316 7794</a>.</p>

    <h2>3. Modalidad</h2>
    <p>Las sesiones se realizarán en línea mediante videollamada. El paciente necesita un dispositivo compatible, conexión estable, acceso a Google Meet y un espacio razonablemente privado.</p>

    <h2>4. Período de tolerancia</h2>
    <p>Se establece un período de tolerancia de <strong>10 minutos</strong> para el inicio de cada sesión. Se recomienda ingresar al enlace cinco minutos antes.</p>

    <h2>5. Enfoque terapéutico</h2>
    <p>El tratamiento se basará en el enfoque de terapia cognitivo-conductual. Sus objetivos, alcances y pertinencia para cada paciente se abordarán directamente dentro del proceso profesional.</p>

    <h2>6. Confidencialidad</h2>
    <p>La información compartida durante las sesiones será confidencial y sólo podrá revelarse con el consentimiento expreso del paciente o en los supuestos previstos por la legislación aplicable.</p>

    <h2>7. Responsabilidad personal</h2>
    <p>El paciente reconoce que el proceso terapéutico requiere su compromiso activo, incluida la disposición a explorar emociones, pensamientos y comportamientos. Se compromete a participar de forma honesta y abierta, dentro de sus posibilidades.</p>

    <h2>Datos de la reservación</h2>
    <ul>
      <li>La fecha, hora, duración y precio vigentes se muestran antes del pago.</li>
      <li>La persona usuaria es responsable de proporcionar un correo válido y revisar los datos antes de pagar.</li>
      <li>El enlace de Google Meet y las instrucciones se compartirán por los medios indicados en la confirmación.</li>
    </ul>

    <h2>Emergencias</h2>
    <p>Este sitio no monitorea mensajes de forma permanente ni presta atención de urgencia. Si existe riesgo inmediato para ti o para otra persona, llama al <a href="tel:911">911</a> o acude al servicio de urgencias más cercano.</p>

    <h2>Privacidad y proveedores externos</h2>
    <p>El tratamiento de datos se explica en el <a href="/aviso-de-privacidad">aviso de privacidad</a>. Mercado Pago, Google Meet y WhatsApp operan servicios externos sujetos también a sus propias políticas.</p>

    <h2>Contacto</h2>
    <p>Para preguntas sobre estos términos, escribe por WhatsApp a la Psico. Miriam Yanagui.</p>
  </LegalPage>;
}
