import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Aviso de privacidad | MY Psicoterapia",
  description: "Conoce cómo MY Psicoterapia utiliza, protege y conserva tus datos personales y la información necesaria para administrar tus citas.",
  alternates: { canonical: "/aviso-de-privacidad" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "article",
    locale: "es_MX",
    url: "/aviso-de-privacidad",
    siteName: "MY Psicoterapia",
    title: "Aviso de privacidad | MY Psicoterapia",
    description: "Información sobre el tratamiento y la protección de datos personales en MY Psicoterapia.",
  },
};

export default function PrivacyNoticePage() {
  return <LegalPage eyebrow="TU INFORMACIÓN" title="Aviso de privacidad" updated="17 de septiembre de 2026">
    <p><strong>Psico. Miriam Yanagui</strong>, responsable de la aplicación <strong>MY Psicoterapia</strong>, con domicilio profesional en C. Perla 2368, Victoria, C.P. 45089, Zapopan, Jalisco, México, es responsable del tratamiento y protección de los datos personales recabados mediante este sitio.</p>

    <h2>Datos que utilizamos</h2>
    <p>Para gestionar una cita podemos tratar tu nombre, correo electrónico, datos de la reservación, fecha y hora elegidas, referencia y estado del pago. Mercado Pago procesa directamente los datos de tu tarjeta; este sitio no recibe ni almacena el número completo de tarjeta ni el código de seguridad.</p>
    <p>Las respuestas opcionales del recorrido inicial se mantienen temporalmente en tu navegador para personalizar la experiencia. Actualmente no se guardan en el expediente clínico, no se utilizan para emitir diagnósticos y no sustituyen una valoración profesional.</p>

    <h2>Finalidades necesarias</h2>
    <ul>
      <li>Reservar, cobrar y confirmar la sesión solicitada.</li>
      <li>Compartir instrucciones y datos de acceso a la videollamada.</li>
      <li>Atender dudas relacionadas con la cita y comprobar operaciones.</li>
      <li>Proteger la seguridad, prevenir duplicidades y cumplir obligaciones legales.</li>
    </ul>
    <p>No vendemos información personal. Las herramientas opcionales de analítica o medición publicitaria sólo podrán activarse después de que otorgues tu consentimiento desde el panel de cookies.</p>

    <h2>Proveedores y transferencias</h2>
    <p>Para prestar el servicio intervienen proveedores tecnológicos que procesan información bajo sus propios controles de seguridad: Vercel para alojamiento, Supabase para la infraestructura de datos, Mercado Pago para el cobro y Google Meet para la videollamada. Si decides abrir WhatsApp, la comunicación estará sujeta a las condiciones de ese servicio.</p>

    <h2>Uso de Google Calendar y Google Meet</h2>
    <p>Con autorización expresa de la Psico. Miriam Yanagui, MY Psicoterapia puede conectarse a su cuenta profesional de Google Calendar exclusivamente para crear, consultar, actualizar o cancelar el evento correspondiente a una cita y generar su enlace de Google Meet. La aplicación limita el uso a los datos necesarios para esa operación: fecha y horario de la sesión, duración, correo de la persona invitada, título operativo del evento e identificadores del evento y la videollamada.</p>
    <p>La información obtenida mediante las APIs de Google se utiliza únicamente para administrar la cita y compartir los datos de acceso. No se utiliza para publicidad, elaboración de perfiles, diagnósticos ni entrenamiento de modelos; tampoco se vende. MY Psicoterapia no solicita acceso al Gmail, Google Drive, contactos o calendario personal del paciente.</p>
    <p>Los identificadores del evento y de la videollamada se conservan sólo durante el tiempo necesario para operar, comprobar o aclarar la reservación. La autorización de la cuenta profesional puede revocarse desde la configuración de seguridad de Google; al revocarla, la aplicación deja de acceder a datos nuevos, sin afectar las obligaciones de conservación aplicables a citas ya realizadas.</p>

    <h2>Conservación y seguridad</h2>
    <p>Conservamos la información sólo durante el tiempo necesario para administrar la cita, atender obligaciones profesionales, fiscales o legales y resolver aclaraciones. Aplicamos medidas razonables para evitar accesos, pérdidas o usos no autorizados.</p>

    <h2>Derechos ARCO y revocación</h2>
    <p>Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos, así como revocar tu consentimiento o limitar su uso, mediante un mensaje dirigido a la Psico. Miriam Yanagui por WhatsApp al <a href="https://wa.me/526243167794">+52 624 316 7794</a>. Para proteger tu información podremos pedirte datos que permitan acreditar tu identidad y localizar tu cita.</p>

    <h2 id="cookies">Cookies y almacenamiento local</h2>
    <p>Este sitio utiliza una cookie técnica indispensable y temporal para reconocer de forma segura tu reservación entre pantallas. También guarda en tu dispositivo las preferencias elegidas en el panel de cookies. Las categorías opcionales de analítica y marketing permanecen desactivadas mientras no otorgues tu consentimiento y no reciben respuestas del cuestionario ni información clínica. Puedes eliminar estos datos desde la configuración de tu navegador; hacerlo durante una reserva puede interrumpir el proceso.</p>

    <h2>Cambios al aviso</h2>
    <p>Las modificaciones se publicarán en esta misma página indicando la fecha de actualización.</p>
  </LegalPage>;
}
