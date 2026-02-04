# whyismywebsiteslow — Agent Notes (Architecture + Operations)

This doc is a fast “operating manual” for AI agents working in this repo.

## Product overview

Users paste a URL and get a “premium” performance report:
- PSI (Lighthouse categories + CWV) + simple header checks
- Prioritized insights (severity/category/impact/effort/fix/verify)
- Shareable report pages (public/unlisted)
- Optional crawl of up to 5 internal URLs (MVP)

This repo is being evolved into a SaaS:
- Supabase Auth (cookie-based SSR sessions)
- Supabase Postgres persistence for scans/projects/subscriptions
- Stripe subscriptions + feature gating
- Durable scan jobs (no `setTimeout` after response)

## Stack

- **Astro SSR** (`output: "server"`) with **Vercel serverless adapter**
- **Svelte 5 islands** for interactivity
- **Tailwind CSS v4** via Vite plugin
- **API routes** under `src/pages/api/**`

## Local dev

```bash
npm install
npm run dev
```

Optional `.env`:
```
PSI_API_KEY=...                       # optional; missing => mock PSI data
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
QSTASH_TOKEN=...                      # enables durable scan jobs
APP_BASE_URL=http://localhost:4321    # used to build worker callback URL
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_PRO=...
STRIPE_PRICE_AGENCY=...               # optional
```

## Environment variable helper

All env access should go through `src/lib/env.ts`.

## Auth (Supabase SSR cookies)

- Middleware: `src/middleware.ts`
  - When Supabase env is present, sets:
    - `Astro.locals.supabase`
    - `Astro.locals.user`
- Login: `GET /login` + `POST /api/auth/login`
- Signup: `GET /signup` + `POST /api/auth/signup`
- Logout: `POST /api/auth/logout`

Use `requireUser()` (`src/lib/auth.ts`) in API routes that require auth.

## Scan pipeline (core logic)

Entry point: `runScan()` in `src/lib/scan.ts`
- Crawl: `src/lib/crawl.ts` (optional)
- PSI: `src/lib/psi.ts` (uses mock data if `PSI_API_KEY` missing)
- Checks: `src/lib/checks.ts`
- Insights: `src/lib/insights.ts`
- Scoring: `src/lib/scoring.ts`

## Persistence model

### Local fallback (dev-only)
- `src/lib/store.ts` + `src/lib/db.ts` persist to `.data/reports.json`

### Supabase (production)
- SQL schema: `sql/001_init.sql`
  - `profiles` (1:1 with `auth.users`)
  - `projects` (saved sites)
  - `scans` (history + report_json/summary_json)
  - `subscriptions` (plan + Stripe IDs)

SSR pages that need reports should use `src/lib/reports.ts`:
- `loadStoredReport(id, Astro.locals)`
- `listPublicReports(Astro.locals)`

## Scan jobs (durable; serverless-safe)

### Why
Vercel serverless cannot reliably run work after returning a response, so we do **not** use `setTimeout` background work.

### Flow
- `POST /api/scan` (`src/pages/api/scan.ts`)
  - If Supabase + QStash configured:
    - creates `scans` row: `status=queued`
    - enqueues QStash job to worker endpoint
    - returns `{ id, manageToken? }`
  - Else (local fallback):
    - runs scan synchronously and persists to `.data/`

- Worker endpoint: `POST /api/worker/scan` (`src/pages/api/worker/scan.ts`)
  - Validates token
  - Idempotent: no-op if already `done` / returns if `running`
  - Runs `runScan` and writes `report_json`, `summary_json`, `status=done` (or `failed`)

QStash enqueue helper: `src/lib/qstash.ts`

## Report polling API

- `GET /api/report/:id` (`src/pages/api/report/[id].ts`)
  - Returns `{ status }` while pending
  - Returns `{ status: "done", report }` when complete
  - Strips `report.manage` before returning to clients

## Delete management

- `POST /api/report/:id/delete` (`src/pages/api/report/[id]/delete.ts`)
  - If logged in owner: delete via RLS
  - Else: delete via `manageToken` (compares hash)

## Billing (Stripe)

- `/billing` page: `src/pages/billing.astro` (requires login)
- Checkout: `POST /api/billing/checkout`
  - Creates Stripe customer if needed
  - Creates subscription Checkout session
- Webhook: `POST /api/billing/webhook`
  - Verifies signature
  - Upserts `subscriptions` table

Plan helper: `src/lib/plan.ts`

## TODO / next work areas

- Projects UI + scan history pages
- Feature gating enforcement in `/api/scan` and CTAs in report UI
- Stronger QStash signature verification (optional)
