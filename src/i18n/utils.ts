import { defaultLocale, locales, type Locale, translate, type TranslationKey } from './strings';

// derive the active locale from a URL pathname.
// `/about` → 'en', `/es/about` → 'es', `/` → 'en', `/es` → 'es'.
export function getLocaleFromPath(pathname: string): Locale {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg && (locales as readonly string[]).includes(seg)) {
    return seg as Locale;
  }
  return defaultLocale;
}

// strip the locale prefix from a pathname, returning the "logical" path.
// `/es/about` → `/about` · `/projects/lotus-hall` → `/projects/lotus-hall` · `/es` → `/`.
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && (locales as readonly string[]).includes(parts[0])) {
    parts.shift();
  }
  const rest = parts.join('/');
  return rest ? `/${rest}` : '/';
}

// build the URL for a given path under a given locale.
// localized('/about', 'es') → '/es/about' · localized('/', 'es') → '/es' · localized('/about', 'en') → '/about'.
export function localized(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale) {
    return clean === '/' ? '/' : clean;
  }
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

// produce { en: '/about', es: '/es/about' } for the current page, used by the lang toggle.
export function alternateUrls(pathname: string): Record<Locale, string> {
  const logical = stripLocale(pathname);
  return {
    en: localized(logical, 'en'),
    es: localized(logical, 'es'),
  };
}

// shorthand: bind translate() to a known locale.
export function tr(locale: Locale) {
  return (key: TranslationKey) => translate(locale, key);
}
