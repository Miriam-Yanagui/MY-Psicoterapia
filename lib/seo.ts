export const SITE_URL = "https://www.mypsicoterapia.com";
export const LANDING_PATH = "/onboarding/home";
export const LANDING_URL = `${SITE_URL}${LANDING_PATH}`;
export const LANDING_TITLE = "Psicoterapia en línea con Miriam Yanagui | MY Psicoterapia";
export const LANDING_DESCRIPTION =
  "Agenda una sesión de psicoterapia en línea con la Psico. Miriam Yanagui, con enfoque cognitivo-conductual. Videollamada de 50 minutos.";

export const professionalServiceSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE_URL}/#business`,
  name: "MY Psicoterapia",
  url: LANDING_URL,
  logo: `${SITE_URL}/assets/isotipo_miriam.svg`,
  image: `${SITE_URL}/assets/f01-miriam-home.png`,
  telephone: "+52 624 316 7794",
  address: {
    "@type": "PostalAddress",
    streetAddress: "C. Perla 2368, Victoria",
    addressLocality: "Zapopan",
    addressRegion: "Jalisco",
    postalCode: "45089",
    addressCountry: "MX",
  },
  founder: {
    "@type": "Person",
    name: "Miriam Yanagui",
    jobTitle: "Psicóloga y psicoterapeuta",
  },
  makesOffer: {
    "@type": "Offer",
    price: "800",
    priceCurrency: "MXN",
    itemOffered: {
      "@type": "Service",
      name: "Psicoterapia en línea",
      description: "Sesión de psicoterapia por videollamada con duración de 50 minutos.",
    },
  },
};
