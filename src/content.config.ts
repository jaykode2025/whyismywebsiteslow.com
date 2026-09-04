import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pagesCollection = defineCollection({
  // Modern Content Layer API loader (replaces the legacy `type: "content"`
  // form, which Astro 7 only supports behind `legacy.collectionsBackwardsCompat`
  // - see astro.config.mjs history). Entry `.id` is the extension-stripped,
  // slugified filename (e.g. "some-guide", not "some-guide.mdx"), unlike the
  // legacy API's `.id`, which kept the extension.
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date().optional(),
    // Optional: ties an article to a src/data/pseo.ts platform slug (e.g.
    // "wordpress", "shopify", "nextjs") so it can link to/from that
    // platform's hub page and sibling problem pages. Leave unset for
    // platform-agnostic articles.
    platform: z.string().optional(),
  }),
});

export const collections = {
  pages: pagesCollection,
};
