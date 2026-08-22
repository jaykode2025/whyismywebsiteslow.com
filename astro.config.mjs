// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: "https://www.whyismywebsiteslow.com",
  // The "pages" content collection (src/content.config.ts) uses the legacy
  // `type: "content"` API. Astro 7 silently skips legacy collections during
  // sync/build unless this flag is set - without it, getCollection("pages")
  // always returns an empty array with no build error, just a console
  // warning. TODO (P2): migrate to the modern loader-based Content Layer API
  // (`loader: glob(...)`) and drop this flag.
  legacy: {
    collectionsBackwardsCompat: true,
  },
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  integrations: [svelte(), mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});
