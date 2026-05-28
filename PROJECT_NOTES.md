# entrópica · website · project notes

A handoff document. Open this in any new Claude Code session and it'll have
the project context without re-reading the entire chat history.

Owner: José Barría · josé@entropica-lab.com
Repo: https://github.com/entropicalab/website
Live: https://entropica-lab.com (apex), https://entropica-lab.com/en/ (English)
Local repo: `C:\Users\joseb\OneDrive\Escritorio\EntropicaDESKTOP\GitHub\website`

---

## What this site is

A bilingual, Spanish-default, static portfolio + journal for entrópica
(tropical architecture studio in Panamá, founded by José Barría 2020).

Built with **Astro 6 + MDX**. Deployed to **GitHub Pages** via GitHub Actions
on every push to `main`. Custom domain via DNS A records.

Spanish is the primary language. English is at `/en/`.

---

## File / folder layout

```
src/
  pages/
    *.astro              ← SPANISH (default locale)
    en/*.astro           ← English mirror
    blog/[slug].astro    ← dynamic blog post (es)
    en/blog/[slug].astro ← dynamic blog post (en)
    projects/[slug].astro
    en/projects/[slug].astro
  content/
    projects/{en,es}/<slug>.md    ← case studies, one per locale
    blog/{en,es}/<slug>.md        ← journal posts, one per locale
  content.config.ts               ← collection schemas
  i18n/strings.ts                 ← translation keys + defaultLocale
  i18n/utils.ts                   ← locale routing helpers
  layouts/BaseLayout.astro
  components/{Header,Footer,Analytics,ConsentBanner}.astro
  styles/{global.css,entropica.css}   ← entropica.css is the brand stylesheet, do not edit
  config/analytics.ts             ← GA measurement ID (G-1KD1TGTGZC)
public/
  CNAME                           ← entropica-lab.com
  entropica-{dark,white}.png      ← logos
  jose.png                        ← portrait
  favicon.png
  awards/                         ← reserved
  projects/<slug>/                ← project images, hero is 01.{jpg,png}
  blog/<slug>/                    ← blog hero images
  home/                           ← homepage imagery
.github/workflows/deploy.yml      ← Pages deploy (Node 24 forced)
astro.config.mjs                  ← i18n: es default, en at /en/
```

---

## Locale routing

- `/` → Spanish homepage (from `src/pages/index.astro`)
- `/en/` → English homepage (from `src/pages/en/index.astro`)
- `/projects` → Spanish projects index
- `/en/projects` → English projects index
- Same pattern for `/blog`, `/services`, `/about`, `/contact`, `/privacy`

The `Header.astro` uses the `localized()` helper from `i18n/utils.ts` — never
hardcode `/es/` or `/en/` prefixes in pages or templates.

---

## Project list (canonical, as of session end)

| slug | title | typology | featured | status |
| --- | --- | --- | --- | --- |
| lotus-hall | lotus hall | institutional | ✓ | concept (paris design awards 2024 winner) |
| l34 | l34 (was ocean-reef) | residential | ✓ | in construction |
| private-bank-offices | private bank offices | commercial | ✓ | competition entry |
| ministerio-publico | ministerio público | institutional | | built (MOA 2023 honorable mention) |
| pacific-research | pacific research | institutional | | concept |
| colon-private-residence | colón private residence (was private-residence) | residential | | in design |
| atlantic-research | atlantic research | institutional | | in construction |
| las-vaquitas-offices | las vaquitas offices (was private-office-facades) | commercial | | postponed |
| casa-tn | casa tn | residential | | in construction |
| casa-ih | casa ih | residential | | in construction |
| current-technologies | current technologies | commercial | | built |
| eurostone-showroom | eurostone showroom | commercial | | concept |
| las-lajas-cabins | las lajas cabins | residential | | concept (no hero image yet) |

Three projects have award badges rendered next to the proof metric:
- lotus-hall: Paris Design Awards 2024 (`public/projects/lotus-hall/award-paris-2024.png`)
- ministerio-publico: MOA Panamá 2023 (`public/projects/ministerio-publico/award-moa-2023.png`)

Six projects have a concrete `metric` (the rest intentionally omit it):
- lotus-hall: -36% cooling load reduction
- l34: +62% daylight access increase
- private-bank-offices: -45% radiation on the façade
- ministerio-publico: only the MOA award (no number)
- current-technologies: no metric (label-only "// commercial")
- everything else: no proof block

---

## Blog posts (canonical)

| slug | series / type |
| --- | --- |
| water-in-a-drying-earth | FACC 1.0 (speculative) |
| arctic-data-centers | FACC 2.0 (speculative) |
| living-facade-elements | FACC 3.0 (speculative) |
| glass-delusion | technical opinion |
| sustainable-architecture-panama | long-form guide |
| los-cerros | "case studies we admire" (external) |
| why-the-model-comes-first | studio philosophy (original sample) |

Each post exists in both `src/content/blog/en/` and `src/content/blog/es/`.

---

## Homepage structure (matches portfolio communication flow)

Per `pages/index.astro` (Spanish) and `pages/en/index.astro` (English), top → bottom:

1. Hero (lede: "el sol, el calor, y la humedad determinan el costo energético…")
2. Manifesto strip: `// el desempeño es material de diseño` (sombra / ventilación / humedad / durabilidad / masa térmica / energía + "es arquitectura")
3. `// ¿qué significa eso?` — 3 measurable-results project cards (lotus, l34, private-bank-offices)
4. `// ¿qué significa eso?` — 30–50% more in lifetime operative cost stat
5. `// ¿cómo lo logramos?` — 6 problem cards + punch line about renders
6. `// nuestra oferta` — 4 services (concept design, design+coord, permits, energy advisory)
7. `// nuestra experiencia` — client list grouped by category
8. `// fundador` — josé barría brief + link to about
9. `// manos a la obra` — CTA + contact

Featured projects on homepage are controlled by `featured: true` in their frontmatter,
sorted by `order:`.

---

## Brand & voice rules (strict)

- All lowercase. Spanish accents kept (á, é, í, ó, ú, ñ).
- Eyebrows: `// ...` prefix, UPPERCASE with 0.14em letter-spacing, weight 400.
- Room-mode default: paper background (#f4f1ea), ink-on-paper text.
- Roboto Mono only. Weight 400 for body, 300 for headlines.
- Amber (#fab31e) is the proof color. Maximum one amber accent per visible area.
- Never use em dashes (—). User considers them an AI-text tell. Use commas, periods, or colons.
- Don't make up numbers. If there's no defensible metric, omit the `metric` field entirely.
- Don't label projects as "case studies". They're projects.

The brand system stylesheet is `src/styles/entropica.css` — do not edit.
Site-specific overrides live in `src/styles/global.css`.

---

## i18n strings

All UI chrome (nav labels, footer labels, form labels, consent banner) is in
`src/i18n/strings.ts`. The `t = { en: {...}, es: {...} }` object holds all keys.

To add a new translatable string:
1. Add the key to both `en` and `es` objects in `strings.ts`.
2. Reference it via `tr(locale)('key.name')` in any page.

---

## Content authoring

### add a new blog post

```sh
src/content/blog/es/<slug>.md        # required (default locale)
src/content/blog/en/<slug>.md        # optional, for English version
public/blog/<slug>/01.jpg            # hero image (optional)
```

Frontmatter (see `src/content/blog/en/water-in-a-drying-earth.md` for shape).

### add a new project

```sh
src/content/projects/es/<slug>.md
src/content/projects/en/<slug>.md
public/projects/<slug>/01.jpg        # hero
public/projects/<slug>/02.jpg, 03.jpg, ...  # optional gallery
```

Frontmatter shape (current canonical schema in `src/content.config.ts`):
- `title, slug, locale, eyebrow, lede, location, year, typology` required
- `area, role, status, featured (default false), order, heroImage` optional
- `metric: { value, unit?, label, note? }` optional — OMIT entirely if no defensible number
- `award: { logo, label, url? }` optional — renders next to proof
- `brief, approach` optional — render as two-column text section
- `strategies: [{ label, body }]` optional — render as numbered list (no deltas)
- `gallery: [{ src, tag? }]` optional
- `closingQuote` optional

---

## Analytics + privacy

- GA4 ID `G-1KD1TGTGZC` in `src/config/analytics.ts`
- Consent Mode v2 with denied-by-default
- Custom room-mode consent banner via `src/components/ConsentBanner.astro`
- `/privacy` and `/en/privacy` pages exist
- Sitemap auto-generated at `/sitemap-index.xml` via `@astrojs/sitemap`
- robots.txt at `/robots.txt`

---

## Contact form

- Formspree endpoint id `xkoerobb` — hardcoded in `src/pages/contact.astro` and
  `src/pages/en/contact.astro` as `https://formspree.io/f/xkoerobb`
- Delivers to info@entropica-lab.com
- Honeypot field is `_gotcha`

---

## Local dev (Windows-specific)

This user's machine has a corporate-AV TLS interception that breaks
node's default CA bundle. The workaround:

```
$env:NODE_EXTRA_CA_CERTS='C:\Users\joseb\OneDrive\Escritorio\entropica temp\entropica web 2026\.windows-ca.pem'
cd 'C:\Users\joseb\OneDrive\Escritorio\EntropicaDESKTOP\GitHub\website'
npm run dev   # → http://localhost:4321
```

A `dev.bat` and `dev.ps1` in the repo root do this automatically.
Or just double-click `dev.bat`.

---

## Deploy

GitHub Desktop is the user's git client. Workflow:
1. Make changes in local repo
2. Commit + push from GitHub Desktop
3. `.github/workflows/deploy.yml` runs in ~2 minutes
4. Live at https://entropica-lab.com

---

## Known TBDs / pending items

- `las-lajas-cabins` has no hero image yet (`public/projects/las-lajas-cabins/` is empty)
- some projects have `area: 'TBD m²'` in frontmatter — schema now allows omitting `area`, so just delete the field on those
- SEO + AI-search keyword list per page is still needed from the user (see below)
- Google Search Console: old `/sitemap.xml` from Wix still showing 50 pages — should be removed; new `/sitemap-index.xml` should be re-submitted

## SEO inputs we still need from the user

1. Keyword list (3–5 per page, Spanish) for: home, services, about, each project
2. Google Business Profile setup
3. Confirmation of studio name + address + phone exactly as they want indexed
4. Three phrases the studio wants AI tools to cite them for
5. A 1-line meta description in Spanish (≤ 160 chars)
6. Decisions on high-intent landing pages worth building (e.g., `/servicios/simulacion-energetica-panama`)
