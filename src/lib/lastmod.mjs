// ============================================================
// last-modified dates from git history
// ------------------------------------------------------------
// single source of truth for "when did this page last change":
// the last git commit date of the page's source file. powers both
// the sitemap <lastmod> and the visible "last updated" line.
//
// build-time only (uses node:child_process) — never imported client-side.
// NOTE: CI must check out full history (fetch-depth: 0) for per-file dates;
// with a shallow clone every file falls back to the latest commit date.
// ============================================================
import { execSync } from 'node:child_process';

const cache = new Map();

/** last git commit date for a repo-relative file, with a build-time fallback */
export function gitLastmod(file) {
  if (cache.has(file)) return cache.get(file);
  let date;
  try {
    const out = execSync(`git log -1 --format=%cI -- "${file}"`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    date = out ? new Date(out) : new Date();
  } catch {
    date = new Date();
  }
  if (Number.isNaN(date.getTime())) date = new Date();
  cache.set(file, date);
  return date;
}

/** map a URL pathname to its source file (repo-relative) */
export function pathToFile(pathname) {
  let p = pathname.replace(/^\/+|\/+$/g, '');
  let locale = 'es';
  if (p === 'en' || p.startsWith('en/')) {
    locale = 'en';
    p = p === 'en' ? '' : p.slice(3);
  }
  const dir = locale === 'en' ? 'en/' : '';
  if (p === '') return `src/pages/${dir}index.astro`;

  const proj = p.match(/^projects\/(.+)$/);
  if (proj) return `src/content/projects/${locale}/${proj[1]}.md`;
  const blog = p.match(/^blog\/(.+)$/);
  if (blog) return `src/content/blog/${locale}/${blog[1]}.md`;

  if (p === 'projects') return `src/pages/${dir}projects/index.astro`;
  if (p === 'blog') return `src/pages/${dir}blog/index.astro`;
  if (p === 'tools/cost-calculator') return `src/pages/${dir}tools/cost-calculator.astro`;

  // about, services, faq, contact, privacy
  return `src/pages/${dir}${p}.astro`;
}

/** last-modified Date for a given URL pathname */
export function lastmodForPath(pathname) {
  return gitLastmod(pathToFile(pathname));
}
