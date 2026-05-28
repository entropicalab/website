// translation strings for nav chrome, footer, recurring labels.
// page-body copy lives in the page files themselves (mirrored under /es).
// keep keys flat, easier to grep and audit.

export type Locale = 'en' | 'es';

export const locales: Locale[] = ['es', 'en'];
export const defaultLocale: Locale = 'es';

export const t = {
  en: {
    // nav
    'nav.work': 'work',
    'nav.services': 'services',
    'nav.about': 'about',
    'nav.journal': 'journal',
    'nav.contact': 'contact',

    // chrome / actions
    'cta.contact': 'reach out',
    'cta.viewWork': 'see the work',
    'cta.viewProject': 'view project',
    'cta.readMore': 'read more',
    'cta.back': '← back',

    // footer
    'footer.tagline': 'cool buildings in hot places.',
    'footer.bio': 'entrópica is an energy-led architecture lab in panamá. we design tropical buildings the model says will work, then build them.',
    'footer.studio': 'studio',
    'footer.work': 'work',
    'footer.contact': 'contact',
    'footer.address': 'paitilla · ciudad de panamá',
    'footer.legal': 'watts & matter consulting, s. e.p. · est. 2020',
    'footer.copyright': '© entrópica · all rights reserved',

    // case study labels
    'meta.location': 'location',
    'meta.year': 'year',
    'meta.area': 'area',
    'meta.typology': 'typology',
    'meta.status': 'status',
    'meta.role': 'role',
    'meta.client': 'client',

    // typologies
    'typology.residential': 'residential',
    'typology.commercial': 'commercial',
    'typology.institutional': 'institutional',
    'typology.mixedUse': 'mixed-use',

    // form
    'form.name': 'name',
    'form.email': 'email',
    'form.company': 'company (optional)',
    'form.location': 'project location',
    'form.typology': 'project type',
    'form.brief': 'tell us about the project',
    'form.send': 'send',
    'form.typology.placeholder': 'select one',
    'form.sent.title': 'message received.',
    'form.sent.body': "we'll get back to you within two working days.",

    // consent banner
    'consent.eyebrow': '// privacy',
    'consent.text': 'this site uses google analytics to measure how it is used. no personal data is shared with third parties. cookies are not stored unless you accept.',
    'consent.accept': 'accept',
    'consent.decline': 'decline',
    'consent.more': 'more info',

    // privacy page
    'privacy.title': 'privacy notice.',
    'privacy.lede': "what we collect, why, and how to turn it off.",
  },
  es: {
    // nav
    'nav.work': 'proyectos',
    'nav.services': 'servicios',
    'nav.about': 'estudio',
    'nav.journal': 'apuntes',
    'nav.contact': 'contacto',

    // chrome / actions
    'cta.contact': 'escríbenos',
    'cta.viewWork': 'ver proyectos',
    'cta.viewProject': 'ver proyecto',
    'cta.readMore': 'leer más',
    'cta.back': '← atrás',

    // footer
    'footer.tagline': 'edificios frescos en lugares calurosos.',
    'footer.bio': 'entrópica es un laboratorio de arquitectura energética en panamá. diseñamos edificios tropicales que el modelo dice que funcionarán, y los construimos.',
    'footer.studio': 'estudio',
    'footer.work': 'proyectos',
    'footer.contact': 'contacto',
    'footer.address': 'paitilla · ciudad de panamá',
    'footer.legal': 'watts & matter consulting, s. e.p. · fundada en 2020',
    'footer.copyright': '© entrópica · todos los derechos reservados',

    // case study labels
    'meta.location': 'ubicación',
    'meta.year': 'año',
    'meta.area': 'área',
    'meta.typology': 'tipología',
    'meta.status': 'estado',
    'meta.role': 'rol',
    'meta.client': 'cliente',

    // typologies
    'typology.residential': 'residencial',
    'typology.commercial': 'comercial',
    'typology.institutional': 'institucional',
    'typology.mixedUse': 'uso mixto',

    // form
    'form.name': 'nombre',
    'form.email': 'correo',
    'form.company': 'empresa (opcional)',
    'form.location': 'ubicación del proyecto',
    'form.typology': 'tipo de proyecto',
    'form.brief': 'cuéntanos sobre el proyecto',
    'form.send': 'enviar',
    'form.typology.placeholder': 'selecciona una opción',
    'form.sent.title': 'mensaje recibido.',
    'form.sent.body': 'te responderemos en un plazo de dos días hábiles.',

    // consent banner
    'consent.eyebrow': '// privacidad',
    'consent.text': 'este sitio usa google analytics para medir su uso. no compartimos datos personales con terceros. no se guardan cookies a menos que aceptes.',
    'consent.accept': 'aceptar',
    'consent.decline': 'rechazar',
    'consent.more': 'más información',

    // privacy page
    'privacy.title': 'aviso de privacidad.',
    'privacy.lede': 'qué recolectamos, por qué, y cómo desactivarlo.',
  },
} as const;

export type TranslationKey = keyof typeof t.en;

export function translate(locale: Locale, key: TranslationKey): string {
  return t[locale][key] ?? t.en[key] ?? key;
}
