# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

```bash
# Install & dev server (works with empty .env for basic scanning)
npm install
cp .env.example .env
npm run dev  # Opens http://localhost:4321

# Type checking & build
npx tsc --noEmit
npm run build

# Run tests
npm test  # Runs vitest (outputs to stdout)

# Deploy to production
npm run build
vercel deploy --prod
# OR if Vercel is connected to Git:
git push  # Auto-deploys from the configured branch
```

**Current dev branch:** `cursor/vscode-mcp-config` (7 commits ahead of `main`, not yet live).

---

## Architecture Overview

### The "Money Path" (Product Flow)

This is a **business-first website diagnostics SaaS**, not a PageSpeed wrapper. The flywheel is:

```
SEO content ranks → Visitors scan → Data enriches benchmarks → 
Better reports convert → Monitoring subscriptions → More data cycles
```

**Three layers of business:**
1. **Traffic Engine** — Programmatic SEO pages (`src/pages/website-speed-audit/`, `/guides/`, etc.) capturing high-intent queries.
2. **Data Engine** — Every scan feeds a proprietary dataset (issue taxonomy, industry baselines, fix outcome history).
3. **Monetization** — Free scan → Paid deep report ($9–$49 unlock) → Recurring monitoring ($29–$300/mo subscriptions).

### Core Scan Pipeline

**Entry points:**
- `src/pages/api/scan.ts` — Main synchronous scan (for UI, quick feedback).
- `src/pages/api/scan-enhanced.ts` — Enhanced client-side scanner option.
- `src/pages/api/worker/scan.ts` — Async queue worker (via QStash).

**The pipeline flow:**
```
User submits URL
  ↓
src/lib/scan.enhanced.ts::runEnhancedScan()
  ├─ Fetch site via PSI (Google PageSpeed Insights API)
  ├─ Run checks (enhanced scanner from src/lib/scanner/enhanced.ts)
  ├─ Compute K-Score (weighted performance + SEO + accessibility + content health)
  ├─ Generate insights (prioritized recommendations)
  ├─ [Optional] SEO analysis (seoAnalyzer.ts)
  ├─ [Optional] Image audit (imageAudit.ts)
  ├─ Build business-impact messaging (reportIntelligence.ts)
  └─ Return EnhancedReport to API handler
  ↓
Store in DB (Supabase) or file (/.data/reports.json)
  ↓
Display on report page src/pages/report/[id].astro
  ├─ Show summary + top issues
  ├─ Lock detailed fixes (unless report is unlocked)
  └─ Offer $19 report unlock or $29+/mo monitoring
```

**Key types:** `ScanRequest`, `EnhancedReport`, `KScoreResult` (in `src/lib/types.ts`).

### The K-Score System

A **proprietary composite score** combining:
- **Performance** (Core Web Vitals via Lighthouse)
- **SEO** (on-page + content analysis via seoAnalyzer.ts)
- **Accessibility** (WCAG via Lighthouse)
- **Content Health** (keyword relevance, readability, image optimization)

Computed in `src/lib/kscore.ts`, each category weighted; returns overall score 0–100 with letter grade (A–F).

### Pages & Routing

```
src/pages/
├── index.astro                 # Landing page + scan form
├── scan.astro                  # Scan queue UI (shows status while processing)
├── report/[id].astro           # Report page (core revenue page - paywall here)
├── account.astro               # Account settings (auth required)
├── billing.astro               # Pricing & subscription management
├── admin/                      # Admin dashboard (gated by is_admin or INTERNAL_DASHBOARD_KEY)
│   ├── index.astro
│   ├── users.astro
│   ├── reports.astro
│   └── subscriptions.astro
├── website-speed-audit/        # Programmatic SEO cluster
├── guides/                     # Knowledge base (SEO layer 1)
├── fix-it.astro                # Fix recommendation UI
├── compare/                    # URL comparison (future feature)
└── api/                        # REST endpoints (see below)
```

### API Routes

**Scan endpoints:**
- `POST /api/scan` — Synchronous scan + return report.
- `POST /api/scan-enhanced` — Enhanced scanner option.
- `GET /api/scan` — Get report by ID.

**Auth & account:**
- `POST /api/auth/login`, `signup`, `logout` (via Supabase).
- `GET /api/account/profile` — Get user profile.

**Billing (Stripe):**
- `POST /api/billing/checkout` — Create Stripe Checkout Session.
- `POST /api/billing/webhook` — Stripe webhook (subscription/invoice events).

**Admin:**
- `GET /api/admin/users`, `reports`, `subscriptions` (requires auth + is_admin).
- `POST /api/admin/users/:id/toggle-admin` (admin mutation — requires real admin user).

**Background work:**
- `POST /api/cron/weekly-monitor` — Weekly monitoring task (Vercel Cron, gated by `CRON_SECRET`).
- `POST /api/worker/scan` — QStash worker endpoint (async scan processor).

**Utilities:**
- `GET /api/debug` — Health check (gated by `DEBUG_KEY` env var, no unauthorized access).
- `GET /api/events` — Analytics event sink.

---

## Key Files & Modules

### Scan & Analysis
- `src/lib/scan.enhanced.ts` — Main orchestrator; coordinates PSI, checks, K-Score, SEO, images.
- `src/lib/scanner/enhanced.ts` — Enhanced Lighthouse-based checks (site analysis).
- `src/lib/scanner/server.ts` — Server-side scanner utilities.
- `src/lib/proof.ts` — Proof artifact generation (screenshots, evidence for recommendations).
- `src/lib/psi.ts` — Google PageSpeed Insights API wrapper.
- `src/lib/kscore.ts` — K-Score calculation logic.
- `src/lib/insights.ts` — Insight generation (prioritized, actionable recommendations).
- `src/lib/seoAnalyzer.ts` — SEO content analysis (on-page, keyword relevance, readability).
- `src/lib/imageAudit.ts` — Image optimization audit.
- `src/lib/reportIntelligence.ts` — Business impact messaging, tech stack detection, recommendation summary.

### Monetization & Auth
- `src/lib/stripe.ts` — Stripe API wrapper (minimal; most logic in API handlers).
- `src/lib/db.ts` — Supabase client & basic DB queries.
- `src/lib/adminAuth.ts` — Admin access control (`requireAdmin`, `requireAdminMutation`).
- `src/lib/entitlements.ts` — Report unlock logic (check if user paid).
- `src/lib/auth.ts` — Auth helpers (session checks, etc.).

### Security & Validation
- `src/lib/validate.ts` — URL validation, hostname checks.
- `src/lib/dnsGuard.ts` — DNS rebinding protection (resolves domains, blocks private IPs).
- `src/lib/retry.ts` — Fetch with exponential backoff + safety guards (SSRF, DNS checks).
- `src/lib/csrf.ts` — CSRF token generation & validation.
- `src/lib/sanitize.ts` — HTML sanitization (DOMPurify).

### Data & Content
- `src/data/pseo.ts` — Programmatic SEO page data (platform, fix, industry clusters).
- `src/lib/related.ts` — Related content link generation.
- `src/lib/contentValidation.ts` — Validation for SEO content structure.

### Types & Constants
- `src/lib/types.ts` — Core TypeScript types (`ScanRequest`, `EnhancedReport`, `Device`, `Visibility`, etc.).
- `src/lib/checks.ts` — Check definitions & metadata.
- `src/lib/scoring.ts` — Score computation helpers.

### Utilities
- `src/lib/qstash.ts` — QStash (Upstash) client for background jobs.
- `src/lib/logger.ts` — Simple logging.
- `src/lib/timingSafe.ts` — Timing-safe string comparison.
- `src/lib/sliding-rate-limit.ts` — Rate limiting (per IP).
- `src/lib/variation.ts` — A/B testing / variant selection logic.
- `src/lib/analytics.ts` — Analytics event tracking.

### Supabase
- `src/lib/supabase/` — RLS policies & database schema reference.

---

## Environment Variables

See `.env.example` for the full list. Key ones:

**Core (needed for any feature):**
- `APP_BASE_URL` — Your production URL (e.g., `http://localhost:4321` for dev, `https://whyismywebsiteslow.com` for prod).

**Scanning only (no external services needed):**
- `PSI_API_KEY` (optional) — Google PageSpeed Insights API key (improves rate limits).

**Auth & database:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase credentials.
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` — Public Supabase keys (for client-side auth).

**Billing (Stripe):**
- `STRIPE_SECRET_KEY` — Stripe secret key.
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret.
- `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PRO_YEARLY` — Subscription price IDs.
- `STRIPE_PRICE_AGENCY` — Enterprise price ID.
- `STRIPE_PRICE_REPORT_UNLOCK` — Report unlock one-time price ID.

**Background jobs (QStash):**
- `QSTASH_TOKEN` — Upstash QStash token.

**Cron jobs (Vercel):**
- `CRON_SECRET` — Random secret for Vercel cron authorization.

**Optional (alerts, AI):**
- `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `SALES_NOTIFY_EMAIL` — Email alerts via Resend.
- `OPENAI_API_KEY`, `OPENAI_MODEL` — For AI features (recommendations, summaries).

**Dev/debugging:**
- `DEBUG_KEY` — Unlock `/api/debug` endpoint.
- `INTERNAL_DASHBOARD_KEY` — Alternative gate for `/admin` dashboard (shared secret instead of `is_admin` user).
- `CHROME_EXECUTABLE_PATH` — Path to Chrome for Playwright (optional; auto-detected).

---

## Testing

```bash
npm test            # Run all tests (vitest)
npm test -- --ui    # Interactive test UI
```

**Test files:**
- `src/lib/plan.test.ts` — Plan/scheduler logic tests.
- `src/lib/scoring.test.ts` — K-Score calculation tests.
- `src/lib/validation.test.ts` — URL & input validation tests.

**Coverage notes:**
- Scanner unit tests: `src/lib/scanner/enhanced.ts` (business logic for checks).
- API integration: not heavily tested in CI (would require external services mock).
- UI tests: minimal (Svelte components tested via `astro build`).

---

## Database (Supabase)

**Core tables:**
- `profiles` — User accounts (auth via Supabase Auth). Columns: `id`, `email`, `is_admin`, `created_at`.
- `reports` — Scan reports. Columns: `id`, `url`, `user_id`, `device`, `data` (JSON), `created_at`.
- `subscriptions` — Stripe subscriptions. Columns: `id`, `user_id`, `stripe_subscription_id`, `status`, `plan`, `renewal_date`.
- `stripe_webhook_events` — Webhook log. Columns: `id`, `event_id`, `event_type`, `processed_at`.

**Schema:** See `supabase/migrations/` for migration history. Apply with:
```bash
npx supabase db push  # Or run migrations manually in Supabase SQL editor
```

**RLS (Row-Level Security):** Users can only view their own reports; admins see all. See `supabase/` docs.

---

## Deployment

**Prerequisites:**
- Vercel project connected (or manual deploy).
- All required env vars set in Vercel project settings.
- Stripe products/prices created.
- Supabase migrations applied.

**To deploy:**

```bash
# 1. Test locally
npm run build
npm run preview

# 2. Deploy
vercel deploy --prod
# OR (if Vercel is connected to Git):
git push
```

**Vercel configuration:**
- `vercel.json` — Defines cron jobs (`/api/cron/weekly-monitor` runs weekly).
- `astro.config.mjs` — Astro + Vercel adapter (server output, analytics enabled).

**Cron jobs:**
- Weekly monitoring (`/api/cron/weekly-monitor`, Mondays 1 PM UTC) — Re-scans monitored projects, sends alerts if regressions detected.

---

## Key Concepts & Patterns

### Monetization Flow
1. **Free scan** → Report page locked (preview only).
2. **Click "Unlock Report"** → Stripe Checkout Session created.
3. **User pays $19** → Stripe webhook fires, `stripe_webhook_events` logged, `reports` marked as unlocked.
4. **User can now see full report** (via `isReportUnlocked()` check in page).
5. **Subscribe to monitoring** → Recurring billing via Stripe (automatic invoicing, webhook renewal).

### Admin Access Patterns
- **Dashboard view** (`/admin`) — Gated by `INTERNAL_DASHBOARD_KEY` (shared secret) OR `is_admin` user.
- **Admin mutations** (toggle user admin status) — Gated by `requireAdminMutation()` (real `is_admin` user required, shared key does NOT work).
- User roles: `is_admin` boolean in `profiles` table.

### Security Patterns
- **SSRF protection** — `dnsGuard.ts` resolves all domains before fetch; blocks private IPs (10.*, 172.16–31.*, 192.168.*, 127.*, localhost, etc.).
- **DNS rebinding** — `dnsGuard.ts` also time-checks (resolves again if cached >5 min old to catch rebinding attacks).
- **Rate limiting** — `slidingRateLimit.ts` per-IP, sliding window (100 scans per 24h per IP).
- **CSRF** — Tokens in forms; validated server-side via `csrf.ts`.
- **Timing-safe comparison** — `timingSafe.ts` for secrets (prevents timing attacks).

### Content Structure
- **Programmatic SEO** lives in `src/data/pseo.ts` (platform, fix, industry clusters).
- **Guides** in `src/pages/guides/` (Markdown files, auto-routed).
- **Related content** — `related.ts` builds link graphs (e.g., "If you fixed image bloat, you might also care about JS optimization").

---

## Common Tasks

### Add a new API endpoint
1. Create file in `src/pages/api/...` (e.g., `src/pages/api/myendpoint.ts`).
2. Export `export async function post(request)` (or `get`, `put`, etc.).
3. Return `new Response(JSON.stringify(...), { status, headers })`.
4. Add auth/validation as needed (`requireAuth()`, `validateUrl()`, etc.).
5. Test via `npm test` or manual curl/Postman.

### Add a new check (scanner logic)
1. Define check in `src/lib/checks.ts` (metadata: title, description, impact).
2. Implement logic in `src/lib/scanner/enhanced.ts` (or create a new module, import it).
3. Wire it into `src/lib/scan.enhanced.ts::runEnhancedScan()`.
4. Test in `src/lib/scanner.test.ts` if adding unit tests.
5. Verify K-Score computation includes it.

### Add a new SEO page (programmatic content)
1. Add entry to `src/data/pseo.ts` (platform, fix, industry, comparison clusters).
2. Create route in `src/pages/` (e.g., `src/pages/website-speed-audit/[slug].astro`).
3. Use `src/pages/website-speed-audit/[...slug].astro` for dynamic routing (see existing pattern).
4. Link via `related.ts` so pages discover each other.
5. Build `npm run build` and verify routes appear.

### Debug a scan
- **Check PSI call:** Use `PSI_API_KEY` env var; without it, uses free tier (5 qpm limit).
- **Check enhanced scanner:** Review `src/lib/scanner/enhanced.ts` logic; add `console.log` or use debugger.
- **Check K-Score:** Inspect `src/lib/kscore.ts` weighting; test via `npm test src/lib/scoring.test.ts`.
- **Check report rendering:** Verify `EnhancedReport` shape matches `src/lib/types.ts`; check `src/pages/report/[id].astro` for rendering errors.

### Stripe integration testing
- **Test Checkout:** Use Stripe's test card `4242 4242 4242 4242` (any future exp date, any CVC).
- **Test webhook locally:** Use `stripe listen --forward-to localhost:4321/api/billing/webhook` (requires Stripe CLI).
- **Check webhook log:** See `stripe_webhook_events` table in Supabase.

---

## Known Open Items

From the project memory & audits:

1. **Redis-backed distributed rate limiting** — Currently per-IP in-memory; doesn't scale across instances.
2. **DNS-rebinding closure** — `dnsGuard.ts` mitigates the bigger domain-resolution gap; a true DNS-pinned fetch dispatcher remains future work.
3. **Programmatic SEO consolidation** — Three overlapping systems (product/content call, not quick); documented in `CONTENT_CLUSTER_PLAN.md`.
4. **Stripe live mode setup** — Never exercised live; smoke test needed (checkout + webhook + Supabase round-trip).
5. **Dependencies** — Vercel's Dependabot reported ~100 vulnerabilities as of Aug 2026; mostly auto-fixed in this branch.

---

## Useful References

- `README.md` — Product vision & quick setup.
- `RUNNING.md` — Detailed setup for each feature (what env vars unlock what).
- `AGENTS.md` — Instructions for AI/Claude Code workflow (how to deploy, etc.).
- `PRODUCT-DOCTRINE.md` — Business model, the three-layer flywheel, product principles.
- `PROJECT_AUDIT.md` — Full architecture & security audit (from session 1).
- `SEO_AUDIT.md`, `SEO_KEYWORD_MAP.md` — SEO strategy & keyword clusters.
- `INTERNAL_LINK_MAP.md` — Content relationship graph.
- `CONTENT_CLUSTER_PLAN.md` — Planned pSEO consolidation.
- `.cursorrules` — None present; Cursor-specific rules via future Cursor Rules SDK if added.

---

## Git & Deployment Notes

**Current state:**
- Working branch: `cursor/vscode-mcp-config` (7 commits ahead of `main`).
- No PR opened yet; code not live until merged to `main`.
- Vercel auto-deploys from configured branch (check Vercel project settings).

**To make changes live:**
1. Commit to `cursor/vscode-mcp-config` (or your working branch).
2. Create PR to `main` (via GitHub).
3. Merge PR → Vercel auto-deploys.
4. OR manually: `npm run build && vercel deploy --prod`.

**Commit messages:** Include context (what changed + why), especially for security or data-affecting changes.

---

## Questions to Ask When Lost

1. **What feature am I building?** → Check `PRODUCT-DOCTRINE.md` (is it part of the flywheel?).
2. **Which user sees this?** → Check `AGENTS.md` & routing (auth, admin, public?).
3. **Where does data come from?** → Trace `src/pages/api/scan.ts` → `src/lib/scan.enhanced.ts` → checks/PSI/SEO/images.
4. **How does money flow?** → See `src/pages/report/[id].astro`, `src/lib/entitlements.ts`, Stripe webhook handler.
5. **Is this a security concern?** → Check `dnsGuard.ts`, `validate.ts`, `csrf.ts`, rate limiting.

---

**Last updated:** 2026-09-05 (from session init task)
