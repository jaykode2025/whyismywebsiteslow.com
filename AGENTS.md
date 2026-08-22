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

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If a deployment URL returns a Vercel Deployment Protection 401/403, retry the same URL with `vercel curl <url>`; don't disable protection or manage bypass secrets manually
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
