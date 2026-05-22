// ============================================================
// analytics config
// ------------------------------------------------------------
// to wire up google analytics:
//   1. go to analytics.google.com → admin → data streams
//   2. add a new web stream for entropica-lab.com
//   3. copy the measurement id (looks like G-XXXXXXXXXX)
//   4. replace the value below
//   5. push. that's the only swap needed.
//
// if MEASUREMENT_ID is left as the placeholder, the gtag
// snippet won't load at all (the BaseLayout checks for the
// placeholder string). nothing breaks, nothing tracks.
// ============================================================

export const ANALYTICS = {
  // ga4 measurement id for entropica-lab.com (data stream created 2026-05-22)
  measurementId: 'G-1KD1TGTGZC',

  // domain to scope cookies to. helps with subdomain consistency.
  cookieDomain: 'entropica-lab.com',

  // whether to enable analytics at all (set false to disable site-wide)
  enabled: true,
} as const;

// computed: is the measurement id actually filled in?
export const analyticsConfigured =
  ANALYTICS.enabled &&
  ANALYTICS.measurementId.startsWith('G-') &&
  !ANALYTICS.measurementId.includes('REPLACE_ME');
