import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const pagesCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date().optional(),
  }),
});

export const collections = {
  pages: pagesCollection,
};
