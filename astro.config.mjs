// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: "https://whyismywebsiteslow.com",
  adapter: vercel(),
  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()]
  }
});
