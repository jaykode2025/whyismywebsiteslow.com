# whyismywebsiteslow

Performance report generator built with Astro, Svelte, and Tailwind. Paste a URL, run a scan, and share a premium report with Core Web Vitals, scoring, and prioritized fixes.

## Features

- Real Lighthouse + Core Web Vitals data via PageSpeed Insights
- Shareable report pages with grade, timeline, and fix checklist
- Optional crawl of up to 5 internal pages
- Unlisted vs public reports (SEO-friendly)
- Simple rate limiting and manage token for deletes

## Tech Stack

- Astro (static-first, SEO optimized)
- Svelte islands for interactivity
- Tailwind CSS + forms + typography plugins
- TypeScript everywhere

## Local Setup

```bash
npm install
npm run dev
```

### Environment

Create a `.env` file in the project root:

```
PSI_API_KEY=your_google_pagespeed_key

# SaaS / production (optional locally)
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_PRO=...
# STRIPE_PRICE_AGENCY=... (optional)

QSTASH_TOKEN=...
APP_BASE_URL=http://localhost:4321
```

`PSI_API_KEY` is optional for local development. If it is missing, the app falls back to mock PSI data.

If Supabase + QStash env vars are present, scans are persisted to Supabase and executed via a durable worker job.

## API

- `POST /api/scan`
  - Body: `{ url, device, crawl, visibility }`
  - Returns: `{ id, manageToken }`
- `GET /api/report/:id`
  - Returns report JSON or status
- `POST /api/report/:id/delete`
  - Body: `{ manageToken }`

## Storage

Local development can persist reports to `.data/reports.json`.
Production persistence uses Supabase Postgres (see `sql/001_init.sql`).

## Production Notes

- This project currently uses Node APIs (fs/crypto), so deploy to a Node/serverless runtime (ex: Vercel Serverless).
- Set `PSI_API_KEY` in your host environment to enable live scans.
- Configure Supabase + QStash for durable scan execution (no background `setTimeout` work).
- Configure Stripe for subscriptions and feature gating.

## License

MIT
