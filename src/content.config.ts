import { defineCollection, z } from 'astro:content';

const pagesCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date().optional(),
  }),
  loader: async (entry) => {
    // entry.render() shape can vary depending on your setup; cast to any to be permissive.
    const rendered = await (entry as any).render?.();
    return {
      slug: entry.slug,
      // prefer `html` or `body` if present; otherwise leave null
      body: (rendered as any)?.html ?? (rendered as any)?.body ?? null,
      data: entry.data,
    };
  },
});

export const collections = {
  pages: pagesCollection,
};
