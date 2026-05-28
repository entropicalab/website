import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ============================================================
// projects collection, case studies
// one file per project; one file per locale per project.
// files live under <locale>/<slug>.md (e.g. en/lotus-hall.md, es/lotus-hall.md)
// the custom generateId keeps the locale prefix in the id so en/lotus-hall
// and es/lotus-hall don't collide.
// ============================================================
const projects = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/projects',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    locale: z.enum(['en', 'es']),
    eyebrow: z.string().optional(),
    lede: z.string(),
    location: z.string(),
    // year can be a number, a year range, or 'TBD' for new drafts
    year: z.union([z.number(), z.string()]),
    area: z.string().optional(),
    typology: z.enum(['residential', 'commercial', 'institutional', 'mixed-use']),
    role: z.string().optional(),
    status: z.string().optional(),
    // hero metric (single number that earned the project) — optional;
    // omit entirely for projects where there's no defensible proof to show.
    metric: z
      .object({
        value: z.string(),
        unit: z.string().optional(),
        label: z.string(),
        note: z.string().optional(),
      })
      .optional(),
    // photo handling
    heroImage: z.string().optional(),
    gallery: z.array(z.object({ src: z.string(), tag: z.string().optional() })).optional(),
    // award badge (image path + caption) — appears next to the metric block
    award: z
      .object({
        logo: z.string(), // path to badge image, e.g. /projects/lotus-hall/award-paris-2024.png
        label: z.string(), // e.g. 'paris design awards · 2024 · cultural architecture'
        url: z.string().optional(), // optional outbound link
      })
      .optional(),
    // narrative
    brief: z.string().optional(),
    approach: z.string().optional(),
    // strategy stack, cumulative moves
    strategies: z
      .array(
        z.object({
          label: z.string(),
          body: z.string(),
          delta: z.string().optional(), // e.g. "-12%"
        })
      )
      .optional(),
    resultLabel: z.string().optional(),
    resultDelta: z.string().optional(),
    closingQuote: z.string().optional(),
    featured: z.boolean().default(false),
    order: z.number().optional(),
  }),
});

// ============================================================
// blog collection, journal posts
// files live under <locale>/<slug>.md (e.g. en/why-we-simulate-first.md)
// ============================================================
const blog = defineCollection({
  loader: glob({
    pattern: '**/*.{md,mdx}',
    base: './src/content/blog',
    generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    locale: z.enum(['en', 'es']),
    eyebrow: z.string().optional(),
    summary: z.string(),
    date: z.coerce.date(),
    author: z.string().default('josé barría'),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, blog };
