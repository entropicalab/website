// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://entropica-lab.com',
  trailingSlash: 'never',
  integrations: [
    mdx(),
    sitemap({
      // keep work-in-progress / noindex tools out of the sitemap
      filter: (page) => !page.includes('/tools/'),
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
