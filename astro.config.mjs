// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { lastmodForPath } from './src/lib/lastmod.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://entropica-lab.com',
  trailingSlash: 'never',
  // wix-era urls that are still in google's index and 404 today (confirmed in the
  // 2026-07-15 search console export). github pages cannot issue real 301s, so a
  // static build emits a meta-refresh + canonical page here; google follows those.
  // deliberately NOT redirected:
  //   /projects/casa-lo            → "casa los oliu", withdrawn, let it 404
  //   /project-dafts/retainer-model → internal draft that leaked, let it 404
  redirects: {
    '/resources': '/blog',
    '/resources/arctic-data-centers': '/blog/arctic-data-centers',
    // no los-cerros post was ever migrated, so send it to the index
    '/resources/los-cerros': '/blog',
    '/living-facade-elements': '/blog/living-facade-elements',
    '/projects/ministerio-pblico': '/projects/ministerio-publico',
  },
  integrations: [
    mdx(),
    sitemap({
      // stamp each url with its source file's last git-commit date
      serialize(item) {
        try {
          const { pathname } = new URL(item.url);
          item.lastmod = lastmodForPath(pathname).toISOString();
        } catch {
          /* leave lastmod unset on failure */
        }
        return item;
      },
    }),
  ],
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});
