# Cursor Project Guide — whyismywebsiteslow.com

## 0) Mission
Build a fast, conversion-focused SaaS + lead-gen website that helps users:
1) Scan a URL for performance/SEO issues (PSI/Lighthouse-style).
2) Get prioritized fixes with impact/effort + verification steps.
3) Purchase: (a) one-time manual audit, (b) monthly monitoring subscription.

Primary goal: **make money** via paid audit + subscription.
Secondary goal: SEO traffic via programmatic pages + strong internal linking.

## 1) Stack & Constraints
- Framework: Astro (pages, routing, SEO)
- UI: Svelte components (already in repo: ReportFilters.svelte, ShareActions.svelte)
- Styling: Tailwind (or existing CSS system—respect current project)
- Data: Supabase (optional if already wired); otherwise use SQLite/JSON until Supabase is ready
- Payments: Stripe (Checkout + Webhooks)
- Hosting: Vercel preferred (Astro supported)
- Performance: keep bundle small, avoid heavy client JS, partial hydration only

### Hard rules
- No new framework migrations.
- No giant dependencies unless justified.
- Write clean, typed code (TypeScript).
- Keep pages accessible (semantic HTML, aria).
- Every page must have a CTA.

## 2) Business Requirements
### Offers
- One-time: "Manual Speed Audit" ($49–$99)
- Subscription: "Weekly Health Monitoring" ($19/$39/$79 tiers)

### Funnel
- Landing -> Scan -> Report -> CTA (Buy audit / Start monitoring)
- Email capture optional but recommended (post-report)

### Key pages
- `/` (landing)
- `/scan` (input URL, device selector)
- `/report/[id]` (results + filtering + share actions)
- `/compare/[id]` (compare results)
- `/pricing` (tiers + Stripe checkout)
- `/checkout/success` and `/checkout/cancel`
- `/account` (if auth exists) OR simple "manage subscription" link from Stripe
- SEO pages (programmatic): `/why-is-my-[platform]-site-slow` etc.

## 3) Technical Requirements
### Scanning
- Use Google PageSpeed Insights API (PSI).
- Support mobile/desktop strategy.
- Persist each scan result with:
  - id, url, strategy, timestamp
  - category scores (performance, accessibility, best-practices, seo)
  - core web vitals (LCP, CLS, INP/FID, TTFB where available)
  - opportunities/diagnostics (top items only)
- Provide a "Prioritized Fixes" list with:
  - severity (critical/high/medium/low)
  - impact (high/med/low)
  - effort (high/med/low)
  - description, why it matters, how to fix, how to verify

### Data Model (minimal)
- scans: id, url, strategy, created_at, raw_json, derived_json
- users (optional): id, email
- subscriptions (optional): user_id, stripe_customer_id, status, tier
- monitors (optional): url, strategy, schedule, last_scan_id

### Payments
- Stripe Checkout for one-time audit + subscription.
- Webhook endpoint:
  - handle checkout.session.completed
  - handle invoice.payment_succeeded/failed
  - handle customer.subscription.updated/deleted
- Store Stripe customer/subscription IDs in DB if DB exists.

### Email (optional)
- Send purchase confirmation + "what happens next"
- Send weekly report emails for subscribers

## 4) UX Requirements
- Simple URL input with validation + normalization
- Loading state + error state (PSI rate limits, invalid URL)
- Report page:
  - headline summary
  - category cards
  - vitals section
  - prioritized checklist with filters (severity/category)
  - share actions
  - clear paid CTA modules:
    - "Want me to fix this?" buy audit
    - "Monitor weekly" subscribe
- Compare page:
  - side-by-side scores and vitals
  - highlight deltas

## 5) SEO Requirements
- Every page must have:
  - title, meta description, canonical
  - OpenGraph/Twitter tags
- Programmatic SEO:
  - generate pages for platforms/issues
  - include FAQ schema (JSON-LD) where relevant
  - internal linking to `/scan` and `/pricing`
- Avoid thin content: each SEO page must be useful and unique.

## 6) Security & Safety
- Never log secrets.
- Use environment variables:
  - PSI_API_KEY
  - STRIPE_SECRET_KEY
  - STRIPE_WEBHOOK_SECRET
  - PUBLIC_SITE_URL
- Sanitize user input URLs.
- Basic abuse control:
  - rate limit scan endpoint
  - block private IP ranges if server fetches URLs directly (PSI doesn't require it, but be safe)

## 7) Code Quality Bar
- Prefer server-side rendering where possible.
- Keep components small and reusable.
- Add tests for:
  - URL normalization/validation
  - scoring/derived insights generator
- Use consistent formatting (prettier/eslint) if present.
- Add clear README updates for local dev and env vars.

## 8) Execution Plan (Do in Order)
### Milestone A — Monetize fast (MVP)
1) Landing + CTA -> Scan
2) Server endpoint to call PSI and store scan
3) Report page with prioritized fixes + filters
4) Pricing page + Stripe Checkout (one-time audit)
5) Success page with instructions + intake form

### Milestone B — Recurring revenue
6) Subscription tiers + Stripe subscription checkout
7) Webhook + subscription status tracking
8) Monitoring: schedule weekly scans (cron/queue) + email summary

### Milestone C — SEO growth
9) Programmatic SEO pages (platform + pain)
10) Blog (optional) — only if it supports conversions

## 9) "Done" Definition
A feature is done when:
- It is reachable via UI
- It handles errors gracefully
- It has tracking events (basic)
- It has at least one test if it's logic-heavy
- It has a CTA to paid offer where appropriate

## 10) Communication Style for AI Agent
When you respond:
- Be brief, list steps.
- If you change files, show diffs or file paths.
- If unsure, choose the simplest workable option.
- Never invent APIs; check existing code patterns first.
