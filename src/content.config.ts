import { defineCollection, z } from 'astro:content';

const pagesCollection = defineCollection({
  type: 'content',
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