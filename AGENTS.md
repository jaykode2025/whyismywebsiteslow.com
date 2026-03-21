# AI / Agent instructions for this project

This doc tells AI assistants how to improve the **live** website and how those changes get online.

## Live site

- **Production URL:** https://www.whyismywebsiteslow.com (or https://whyismywebsiteslow.com)
- **Stack:** Astro 5, Svelte, Tailwind, Supabase, Stripe, Vercel.

## How to improve the live site

1. **Check the live site**  
   When the user asks for improvements or updates, open the production URL (e.g. in the browser or via fetch) and note what’s wrong or what to change.

2. **Edit the codebase**  
   Make changes in this repo (pages, components, styles, API routes, etc.). All edits are in the repo; the live site does not get edited directly.

3. **Deploy so the live site updates**  
   The user does everything with AI in the terminal. **You (the AI) can run the deploy** when they ask to update the live site:
   - Run `npm run build` (and `npx tsc --noEmit` if you want to typecheck first).
   - Then either:
     - **Vercel CLI:** run `vercel deploy --prod` from the project root, or
     - **Git:** run `git add -A && git commit -m "..." && git push` so Vercel auto-deploys from the connected branch.

So: **AI checks site → AI edits repo → AI runs build + deploy in terminal → live site shows the improvements.**

## What you can do

- **Browse / inspect** the live site to see current content, layout, and behavior.
- **Change** pages, components, styles, and API routes in `src/`.
- **Add or update** content, copy, SEO, and configuration.
- **Run terminal commands** to build and deploy when the user wants the live site updated: `npm run build` then `vercel deploy --prod`, or `git push` if Vercel is connected to the repo.

## Repo layout (quick ref)

- `src/pages/` – Routes (including `api/`).
- `src/components/` – Shared UI (including `ui/`, `seo/`).
- `src/lib/` – Core logic (scan, reports, auth, Stripe, Supabase, etc.).
- `src/layouts/` – Base layout.
- `astro.config.mjs` – Astro + Vercel adapter.

## Deploy commands (AI can run these in the terminal)

When the user asks to update the live site or deploy, run from the project root:

```bash
# Typecheck (optional)
npx tsc --noEmit

# Build
npm run build

# Deploy to production (choose one)
vercel deploy --prod
# OR, if Vercel is connected to Git:
git add -A && git commit -m "Update site" && git push
```

The user does everything with AI in the terminal—so you should run build and deploy for them when they ask for the live site to be updated.
