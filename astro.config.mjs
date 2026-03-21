// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: "https://www.whyismywebsiteslow.com",
  adapter: vercel({
    webAnalytics: {
      enabled: true,
    },
  }),
  integrations: [svelte(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});
