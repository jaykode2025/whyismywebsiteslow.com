import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// NOTE: the previous custom `loader` here called `entry.render()` on what the
// Content Layer API actually hands the loader (a store/context object, not a
// single entry) — that's what threw "Cannot read properties of undefined
// (reading 'render')" and failed every build. Astro's built-in `glob` loader
// does the file discovery + id generation correctly; nothing here currently
// consumes the rendered MDX body (only `id`/`slug` and `data.pubDate`, via
// sitemap.xml.ts), so there's no render step to reproduce.
const pagesCollection = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './content/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date().optional(),
  }),
});

export const collections = {
  pages: pagesCollection,
};
