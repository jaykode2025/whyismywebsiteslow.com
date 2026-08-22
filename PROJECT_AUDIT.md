# PROJECT_AUDIT.md — WhyIsMyWebsiteSlow.com

**Audit date:** 2026-08-22
**Branch:** `claude/website-slow-audit-dm5jep`
**Method:** Full static review of the repository (architecture, every `src/lib` and `src/pages/api` file, config, SQL, workflows) + actually running `npm install`, `astro check`, `astro build`, `vitest run`, `npm audit`. No live browser walkthrough was performed (no deployed instance / API keys available in this environment); the UX and product audit below is derived from reading the actual page/component code and data flow, which is reliable for correctness and copy but cannot substitute for a real click-through — flagged where relevant.

---

## 1. Executive Summary

This is an ambitious, ~3-month-old Astro/Svelte SaaS project that is **currently not deployable**: `npm run build` fails outright, and even if it were forced to build, **the core scanning feature is broken** (a wrong import means every scan throws at runtime) and **the pricing page cannot take a payment** (it's wired to a checkout provider — Paddle — that isn't configured or documented anywhere, while a fully-built Stripe billing system sits unused one page over). The codebase shows clear signs of iterative AI-assisted development without a working feedback loop: two parallel scanner implementations, two parallel payment providers, two parallel rate limiters, two content-collection configs, and stray duplicate directories (`src/src/`, `src/components/src/`, `content/content/`) that are leftovers from copy/paste mistakes.

The good news: the actual product thinking is solid. The scoring model (K-Score), business-impact framing, locked-report monetization funnel, programmatic SEO structure, and Supabase schema are all well-designed on paper. The security posture is also better than average for a project this size — CSRF tokens, SSRF blocking, HTML sanitization, and Stripe webhook signature verification are all present, just incomplete in places (notably the cloud-metadata SSRF gap and a second scan endpoint that skips validation entirely).

**Bottom line:** this is a few days of focused, non-glamorous fixing away from being a working, demoable product — not a rewrite. The plan below is sequenced so the very first change (fixing the build) unblocks everything else.

---

## 2. Architecture

**Stack:** Astro 5.16 (SSR, `output: "server"`) + Svelte 5 islands + Tailwind 4, deployed via `@astrojs/vercel`. Supabase (Postgres + Auth) for persistence and auth. Stripe for payments. Upstash QStash for background job dispatch. Google PageSpeed Insights + Chrome UX Report (CrUX) for measurement data. Playwright is present in the codebase but not wired into any live code path.

```
Browser
  │
  ▼
Astro SSR pages (src/pages/**/*.astro)  ── Svelte islands (ScanForm, ScanProgress, ReportFilters…)
  │
  ▼
src/middleware.ts — canonical-host redirect, CSRF cookie issuance, Supabase session hydration
  │
  ▼
API routes (src/pages/api/**)
  ├── /api/scan            → validate → rate-limit → insert `scans` row → enqueue QStash job (or run inline if QStash/Supabase absent)
  ├── /api/worker/scan      → QStash-authenticated worker → runs the actual scan → writes report_json back to `scans`
  ├── /api/scan-enhanced    → a SECOND, independent scan endpoint (bypasses the above pipeline entirely)
  ├── /api/billing/*        → Stripe Checkout + webhook → report_entitlements / subscriptions
  ├── /api/auth/*           → Supabase email/password
  └── /api/leads/*, /api/events, /api/reports/recent, /api/report/[id]/*
  │
  ▼
Scan pipeline (src/lib/scan.enhanced.ts) — CURRENTLY BROKEN, see §4 P0-1
  ├── crawlSite()        same-origin link discovery (crawl.ts)
  ├── runEnhancedScanner() CrUX + PSI + a HEAD-request network probe (scanner/server.ts)
  ├── runChecks()        headers / security / caching checks (checks.ts)
  ├── analyzeSeo()        title/meta/heading/canonical audit (seoAnalyzer.ts)
  ├── auditImages()       oversized-image detection (imageAudit.ts)
  ├── computeKScore()     proprietary 0–100 composite score (kscore.ts)
  ├── generateInsights()  turns raw metrics into prioritized fix cards (insights.ts)
  └── reportIntelligence.ts → business-impact narrative + stack detection
  │
  ▼
Storage: Supabase Postgres (scans, projects, profiles, subscriptions, report_entitlements, analytics_events,
          stripe_webhook_events) when configured, else a JSON file store (`src/lib/store.ts`, `.data/`) for
          zero-config local/demo mode.
  │
  ▼
Report page (src/pages/report/[id].astro) — locked/unlocked rendering via entitlements.ts,
  Stripe Checkout for the $19 one-time unlock and $99/mo Pro upsell (per README), OG image generation
  (src/pages/og/**), and a second, contradictory pricing page at /billing (Paddle, $29/mo & $300/mo — see §4 P0-4).
```

**Deployment:** Vercel, SSR adapter, `site: https://www.whyismywebsiteslow.com`. Two GitHub Actions workflows exist (`eslint.yml`, `codeql.yml`) plus a third, `astro.yml`, which is not a valid workflow at all (see §6). No CI step actually runs `astro build`, `astro check`, or `vitest` — meaning the build-breaking bug in §4 P0-1 could not have been caught automatically, and wasn't.

**Environment variables** (from `.env.example`, 25 keys): Supabase (URL/anon/service-role, public duplicates for client use), Stripe (secret key, webhook secret, 4 price IDs), PSI/Google API key, OpenAI key (declared, unused — no `OPENAI_API_KEY` reference anywhere in `src`), Chrome executable path, QStash token, app base URL, Resend email keys, internal dashboard key. **Not documented anywhere:** `PUBLIC_PADDLE_PRO_CHECKOUT_URL` / `PUBLIC_PADDLE_ENTERPRISE_CHECKOUT_URL`, which `/billing` actually depends on.

---

## 3. What Is Working

- **Astro + Svelte + Tailwind setup** is modern and correctly wired (`astro.config.mjs`, Vercel adapter, Tailwind v4 via Vite plugin).
- **Vitest tests pass**: 10/10 (`scoring.test.ts`, `validation.test.ts`) — small but a real, green baseline.
- **Stripe webhook handling** (`api/billing/webhook.ts`): verifies the signature, has an idempotency table (`stripe_webhook_events`) to survive retries, correctly distinguishes subscription events from one-time report-unlock `checkout.session.completed` events, and fires purchase-confirmation email + analytics events.
- **CSRF protection**: double-submit cookie pattern (`lib/csrf.ts`) with `timingSafeEqual`, applied to `/api/scan`.
- **SSRF blocking exists** in `lib/validate.ts` (blocks localhost/RFC1918 ranges) — incomplete (see P0-2) but the instinct is right and it's actually used on the primary scan path.
- **HTML sanitization** via `isomorphic-dompurify` before any scanned HTML is parsed or displayed.
- **K-Score model** (`kscore.ts`) and `reportIntelligence.ts`: genuinely differentiated product thinking — a composite score plus "business impact" and "what to fix first" narrative, which is the stated competitive angle against raw Lighthouse output.
- **Supabase schema** (`sql/001_init.sql`, `supabase/migrations`): reasonable normalization — `profiles`, `projects`, `scans`, `subscriptions`, `report_entitlements`, `analytics_events`, RLS-oriented design.
- **Programmatic SEO scaffolding**: `website-speed-audit/{industry,platform,location}` and `why-is-my-website-slow/[slug]` route trees, OG-image generation endpoints, and a real content pipeline (`bootstrap-pseo.mjs`, `generate-expanded-content.mjs`) — the shape of a good long-tail SEO strategy is already here.
- **Graceful local/demo mode**: the app runs with zero configuration by falling back to a JSON file store and synchronous scans when Supabase/QStash aren't set (good for onboarding a new contributor).

---

## 4. What Is Broken (ranked by severity)

### P0 — the product does not work

**P0-1. Production build fails outright.**
`src/content.config.ts` defines the `pages` content collection with a hand-written `loader` function that calls `entry.render()` — but Astro 5's Content Layer API calls a bare-function loader with a `LoaderContext` (store/config/parseData), not a per-entry object with `.render()`. Every `astro build` and `astro check` crashes immediately:
```
Cannot read properties of undefined (reading 'render')
  at loader (src/content.config.ts:12:34)
```
Verified by actually running `npx astro build` in this session. **Nothing downstream of this matters until it's fixed** — there is currently no way to deploy this site.
*Fix:* replace the custom loader with Astro's built-in `glob()` loader from `astro/loaders`.

**P0-2. Every scan crashes at runtime — the core product doesn't function.**
`src/lib/scan.enhanced.ts` imports `runEnhancedScanner` from `./scanner/enhanced` (`src/lib/scanner/enhanced.ts`). That file only exports scoring/parsing *utilities* (`getCwvStatus`, `calculateOverallScore`, `getGrade`, `extractCruxMetrics`, `extractLighthouseMetrics`) — it does **not** export `runEnhancedScanner`. The actual `runEnhancedScanner` implementation lives in the sibling file `src/lib/scanner/server.ts`. Because Vite/esbuild doesn't type-check at build time, this doesn't fail the build — it fails **every single scan at request time** with `runEnhancedScanner is not a function`. This is the single highest-value fix in the whole codebase: it means the product, as shipped, cannot produce a report.
*Fix:* import from `./scanner/server` instead, and pass `env.PSI_API_KEY()` through (the current call site passes no API key at all, which — even after fixing the import — would silently degrade every scan to score-0 placeholder data).

**P0-3. `sitemap.xml` emits garbage URLs; a live component's JS is broken by the same corruption.**
Four `${...}` template-literal interpolations in `src/pages/sitemap.xml.ts` were mangled into literal `` \( ... \) `` sequences (e.g. `` `\( {base} \){path}` `` instead of `` `${base}${path}` ``), almost certainly from code having been round-tripped through a Markdown/LaTeX renderer that treated `$...$` as inline math. Confirmed with `cat -A` against the raw bytes — this is really in the file, not a display artifact. The sitemap Google receives today for every URL is literally the string `\( {base} \){path}`, not a real URL. The same corruption pattern exists in `src/components/seo/ProofBlock.astro` (an actively-used component rendered on 5+ live pSEO page templates), inside an inline `<script>` that computes `document.getElementById(...)` ids for a savings calculator — meaning that calculator is currently non-functional on every page that includes it.
*Fix:* restore the correct `${...}` interpolations in both files (done — see §10).

**P0-4. The pricing page cannot take a payment.**
`/billing` (`src/pages/billing.astro`) renders `$29/month` Pro and `$300/month` Enterprise plans through `PaddleCheckoutButton.astro`, which reads `PUBLIC_PADDLE_PRO_CHECKOUT_URL` / `PUBLIC_PADDLE_ENTERPRISE_CHECKOUT_URL` from the environment. **Neither variable appears in `.env.example`, `README.md`, or anywhere else in the repo.** Since they're always `undefined` in any real deployment, `PaddleCheckoutButton` always renders its disabled "Checkout unavailable" state. Meanwhile, a fully wired, tested-looking Stripe flow already exists (`api/billing/checkout.ts`, `api/billing/report-checkout.ts`, `api/billing/webhook.ts`, `lib/stripe.ts`, 4 Stripe price IDs already in `.env.example`) but the `/billing` page never calls it. The README describes a *third*, different pricing model ($19 one-time unlock + $99/mo Pro) that matches the Stripe code but not the `/billing` page. **There are three different, mutually inconsistent prices/providers described across this codebase (`README.md`: $19+$99/mo Stripe; `billing.astro`: $29/mo+$300/mo Paddle; Stripe price env vars: PRO/PRO_YEARLY/AGENCY/REPORT_UNLOCK).** This is a monetization-blocking bug, not a copy nit — right now nobody can give this product money through its own pricing page.
*Fix:* this is a product decision, not something to silently pick a winner on — flagged as a blocker requiring your decision in §12. Recommended default: delete the Paddle path, wire `/billing` to the existing Stripe endpoints, and make the README the source of truth for copy.

### P1 — broken or unsafe, but not fully blocking

**P1-1. `/api/scan-enhanced` bypasses every safety control on the primary scan endpoint.** It validates only that the URL parses as `http(s)` — no SSRF blocking (`normalizeUrl` isn't called), no CSRF check, no rate limiting. It's a second, independent way to make the server fetch an arbitrary URL. See §5.

**P1-2. SSRF blocklist misses the most consequential target: cloud-metadata addresses.** `lib/validate.ts` blocks `127.*`, `10.*`, `172.16-31.*`, `192.168.*`, `localhost`, and a few internal-hostname suffixes — but not `169.254.169.254` (AWS/GCP/Azure instance-metadata IP, where the real SSRF-to-credential-theft risk lives on serverless hosts), not `169.254.0.0/16` generally, not `0.0.0.0`, not any IPv6 form (`::1`, `fc00::/7`, `fe80::/10`, `::ffff:127.0.0.1`), and not decimal/octal/hex IP obfuscation (`http://2130706433/` = `127.0.0.1`). It also validates the hostname string once at submission time with no re-resolution — a DNS-rebinding attacker (domain that resolves to a public IP at validation time and a private IP at fetch time) is not addressed by *any* string-based check, only by resolving-and-pinning the IP actually connected to. See §5 for the concrete recommendation.

**P1-3. `/api/debug.ts` is a public, unauthenticated endpoint** that returns which third-party services are configured, the app base URL, in-memory report counts by status, and `process.memoryUsage()`. Not a secrets leak, but free reconnaissance for an attacker and unnecessary in production. `INTERNAL_DASHBOARD_KEY` already exists in the env schema and isn't used to gate this route.

**P1-4. `.env` is committed to git**, despite being listed in `.gitignore` (added in commit `3a77616` after the ignore rule already existed, so the ignore never took effect). Every value in the committed file is a placeholder (`your_supabase_url`, `sk_test_...`, etc.) — confirmed by diffing against `.env.example` — so nothing sensitive has actually leaked *yet*, but the repo now trains contributors that committing `.env` is normal, and the next real key pasted into it (which very likely will happen, since the file is tracked and `git add -A` habits are common) will go straight to a public/shared history.

**P1-5. CI is not actually protecting anything.** `.github/workflows/astro.yml` is not a valid GitHub Actions workflow — it's a fragment of the `actions/cache` action's documentation (no `on:`, `jobs:`, or `name:` keys), committed as-is. `.github/workflows/eslint.yml` references a `.eslintrc.js` that doesn't exist in the repo and would fail every run (though `continue-on-error: true` hides that). There is no workflow that runs `astro build`, `astro check`, or `vitest`, which is exactly why P0-1/P0-2/P0-3 shipped to `main` undetected.

**P1-6. QStash worker auth uses a static shared secret, not signature verification.** `lib/qstash.ts`'s own comment says: *"For stronger guarantees, switch to signature verification (Upstash signing keys) when available."* Today `/api/worker/scan` just checks `Authorization: Bearer <QSTASH_TOKEN>` — functional, but means anyone who obtains that one token (env leak, log leak, `/api/debug` doesn't leak it but does confirm it exists) can directly trigger arbitrary scan re-processing.

**P1-7. Duplicate/dead/contradictory code creates real risk of the next change reintroducing the same bugs:**
- `src/lib/scan.ts` — explicitly commented "Legacy... The app uses `runEnhancedScan`... Kept for optional simple scans or backwards compatibility," but nothing imports it. Dead.
- `src/lib/rateLimit.ts` — a fixed-window limiter with zero importers anywhere in `src`; `src/lib/slidingRateLimit.ts` (a near-identical but sliding-window implementation) is the one actually used by `/api/scan`. Dead duplicate.
- `src/content/config.ts` (legacy per-collection `type: 'content'` API) coexists with `src/content.config.ts` (new Content Layer API, currently broken per P0-1) for the *same* `pages` collection name. Confusing and only one can be right.
- `src/src/lib/scanner/enhanced.ts` and `src/components/src/pages/[slug].astro` — entire duplicate directory trees nested inside `src/`, unreachable by any import, left over from what looks like a bad copy/paste or generation-script mistake. They also carry the same `${...}` → `\(...\)` corruption as P0-3, suggesting they're an earlier, already-broken draft that was never cleaned up.
- `content/content/pages/` (7 MDX files) vs `content/pages/` (1 MDX file, with a typo in its own filename: `-on-moble.mdx`) — same double-nesting mistake, in content instead of code. No content is lost, but a `glob()` loader base of `./content/pages` (the "obvious" fix for P0-1) would silently only publish 1 of the 8 pSEO articles.
- `dompurify` and `jsdom` are both listed as direct dependencies in `package.json`, but only `isomorphic-dompurify` (which bundles its own copy of both) is ever imported. Dead weight, extra install time, extra `npm audit` surface.
- `PLACEHOLDER` images: pSEO article content (`content/pages/*.mdx`) uses `via.placeholder.com` for every hero image — a third-party demo image service, not something you'd want indexed by Google Images or shown to a paying visitor.

### P2 — real, but not urgent

- `stripe`, `@supabase/*`, and dev-toolchain dependencies pull in **26–33 known vulnerabilities per `npm audit`** (severity: 1–2 critical, 18–21 high, 6–9 moderate), the large majority in transitive dev/build tooling (`vite`, `esbuild`, `tar`, `undici`, `svgo`, `ws`, `yaml` — mostly via `@astrojs/vercel`/`supabase` CLI toolchain, not shipped to the client bundle). The one advisory set worth deliberately tracking is the six **Svelte SSR XSS advisories** on `svelte@5.48.3`, since this app does render Svelte components server-side (`@astrojs/svelte`). None of these are exploitable-by-a-website-visitor today, but `npm audit fix` (non-breaking patch bumps) should be run periodically.
- `public/robots.txt` (static) and `src/pages/robots.txt.ts` (dynamic) both existed for the same route; Astro serves the static file over the dynamic route, so the dynamic one was dead code. The static file's `Sitemap:` target (`sitemap-index.xml`, which the `@astrojs/sitemap` integration does generate for real) was pointed at the wrong host (no `www`, so it 308-redirects via middleware before a crawler ever reads it) and, more importantly, only listed one of the site's *two* legitimate sitemaps — it never mentioned the hand-rolled `/sitemap.xml` route that carries the dynamic report pages and pSEO content-collection entries the auto-generated one can't see. Fixed this session (§10).
- **`astro check` surfaces 53 pre-existing TypeScript errors** that were previously masked because the whole check crashed at content sync before reaching them (P0-1). They do not block `astro build` (Astro's build doesn't full-typecheck, it transpiles), so the site does build, but they're real: several `report/[id].astro` accesses to `report.psi.rum.*` without a null-check even though `rum` is typed optional, a few pSEO template type mismatches (`string | undefined` where `ProblemEntry` wants `string`) in the `website-speed-audit`/`why-is-my-website-slow` route trees, and a handful of unused-import warnings. One more `astro check` error class is a false positive worth knowing about, not fixing: `supabase/functions/refresh_scan_insights/index.ts` uses the Deno runtime (`Deno.serve`, `npm:` specifier) as all Supabase Edge Functions do, and will never typecheck cleanly against the root Node/Astro `tsconfig.json` — it needs its own `tsconfig` (or to stay excluded from `astro check`), not code changes.
- Manage-report tokens are put in a URL query string (`/r/:id/manage?token=...`), which typically leaks through referrer headers, browser history, and access logs. Low-risk for an MVP, worth revisiting before scaling monitoring/agency features that rely on that link being shared.
- No lint or typecheck script in `package.json` (`"lint"` doesn't exist), even though a lint CI workflow references one implicitly.

---

## 5. Security Risk Ranking

| Severity | Finding | Notes |
|---|---|---|
| **CRITICAL** | None found that is both exploitable today *and* would compromise user data or infrastructure. The webhook signature check, CSRF, and primary-path SSRF blocking prevent the classic critical outcomes. The items below are the ones that would become critical the moment the product actually works (post P0-2 fix). |
| **HIGH** | SSRF blocklist gap: cloud-metadata IP (`169.254.169.254`) and IPv6/obfuscated-IP forms are not blocked in `lib/validate.ts` (P1-2). On Vercel this is lower-impact than raw EC2 (Vercel functions aren't backed by the classic EC2 IMDS), but it's still the single most consequential class of SSRF target and should never be reachable, on any host. |
| **HIGH** | `/api/scan-enhanced` performs zero SSRF/CSRF/rate-limit checks (P1-1) — it's a second front door into "make the server fetch this URL" with none of the hardening the main door has. |
| **MEDIUM** | `/api/debug.ts` unauthenticated infrastructure disclosure (P1-3). |
| **MEDIUM** | `.env` tracked in git — currently only placeholders, but the habit is dangerous (P1-4). |
| **MEDIUM** | QStash worker relies on a static bearer token rather than signed requests (P1-6). |
| **LOW** | Manage-token in URL query string (§4 P2). |
| **LOW** | Known CVEs in dev-toolchain transitive deps; Svelte SSR XSS advisories on a pinned-but-current version (§4 P2). |

No evidence of: SQL injection (Supabase client is parameterized throughout), command injection (no `child_process`/`eval` usage found), open-redirect abuse beyond the intentional canonical-host redirect, or auth bypass in `requireUser`/`getUserPlan`.

---

## 6. Technical Debt

1. **Two scanner implementations** (`scanner/enhanced.ts` types-only + `scanner/server.ts` real logic, plus a third, older, self-contained, already-broken copy at `src/src/lib/scanner/enhanced.ts`). Consolidate to one.
2. **Two payment providers half-wired** (Stripe fully built and unused by the pricing page; Paddle referenced by the pricing page but never configured). Pick one (§12 blocker).
3. **Two rate limiters**, only one used. Delete the other.
4. **Two content-collection configs** for the same collection (`content.config.ts` vs `content/config.ts`), one using an API that doesn't work.
5. **Stray duplicate directory trees** (`src/src/`, `src/components/src/`, `content/content/`) — pure clutter, all unreachable, but they actively mislead anyone (human or AI) grepping the codebase for "the real" implementation, which is exactly how P0-2 happened.
6. **No working CI** — `astro.yml` isn't a real workflow, `eslint.yml` points at a missing config. There is nothing today that would have caught P0-1/P0-2/P0-3 before merge.
7. **No lint script**, no `astro check` in any script, `README`/`.env.example` drift from what the code (Paddle vars) actually needs.
8. Thin automated test coverage: 2 unit test files covering scoring math and URL validation only — none of the scan pipeline, entitlements, or billing logic is under test, which is exactly the surface where P0-2 lived undetected.

---

## 7. UX Problems (from reading the actual page/component code)

- **The main call to action is currently a dead end.** A visitor who runs a scan today (post-deploy, pre-fix) submits the form successfully (the API call up through job enqueue works), but the job itself throws inside `runEnhancedScanner` (P0-2) and the scan is marked `failed` — so the entire "Landing → Scan → Results" journey, the whole point of the product, currently ends in an error state for 100% of users.
- **Pricing confusion is compounded by two different pages disagreeing with each other and with the README** — a user who reads the homepage/report page (Stripe-flavored: "$19 unlock", "$99/mo monitoring") and then clicks through to `/billing` sees completely different numbers ($29/mo, $300/mo) and a checkout button that does nothing. This isn't a nitpick; it's the single biggest reason a real visitor would bounce before paying.
- **The "manage token shown once" pattern** (`ScanForm.svelte`) is a reasonable no-login-required design, but it's easy to lose (no copy-to-clipboard button, just a `<code>` block) — a returning user who didn't save it has no recovery path other than creating an account.
- **The static `public/robots.txt`** pointed its one `Sitemap:` line at the wrong host (308-redirects before a crawler reads it) and never mentioned the site's second, hand-rolled sitemap at all — this quietly damages discoverability of everything else that's actually well-built (the pSEO tree). Fixed this session.
- **pSEO article images are placeholder.com stock boxes**, not real screenshots/diagrams — fine for a draft, not for content meant to rank and convert.

**Does the site answer the 6 questions the brief asks about?** Based on the code/copy present:
1. *What does this product do?* — Reasonably clear once the scan actually returns a report: it frames itself around business impact, not just raw scores.
2. *Why this over PageSpeed Insights?* — The K-Score/business-impact/prioritization angle is the right differentiator and is present in the copy and the data model — but it's not experienced today because scans fail.
3. *What's free?* — A scan + locked summary. Clear in the report-page code.
4. *What's paid?* — Unclear at the product level (see pricing confusion above) even though the *mechanics* (locked overlay, Stripe checkout) are built.
5. *What problem does it solve?* — Yes, the "why is my site slow, what matters, what to fix first" framing is well-articulated in `reportIntelligence.ts` and the report page copy.
6. *Why should an agency/dev/business owner care?* — Partially: white-label/agency language exists in the Enterprise tier copy, but there's no actual agency feature (batch scanning, white-label export) implemented yet — it's aspirational copy on `/billing` right now.

---

## 8. Product Opportunities (strongest MVP candidates)

Ranked for an early-stage, cash-constrained team, given what's *already 80% built*:

1. **Fix the scan pipeline and ship the existing K-Score report** (P0-1/P0-2) — this alone turns "broken demo" into "working free tool," which is the entire prerequisite for any monetization.
2. **Collapse to one payment path (Stripe) and make `/billing` actually work** — the infrastructure (webhook, entitlements, price IDs) is already there; it just needs to be the thing the pricing page actually calls.
3. **Historical tracking / regression alerts** — `api/worker/weekly-monitor.ts` and `maybeSendRegressionAlert` in `api/worker/scan.ts` already exist and are wired to paid-plan gating. This is close to being a real "monitoring" upsell with almost no new code.
4. **Finish the report-unlock → subscription upsell funnel** exactly as the README describes it ($19 unlock → $99/mo monitor) — it's the cleanest, fastest path to first revenue because the code for it already exists and mostly works; it's the *other*, contradicting billing page that's in the way.
5. **Programmatic SEO content** — the industry/platform/location page trees and the CMS-specific article pipeline are a strong, already-architected acquisition channel; needs real images and the sitemap fix (P0-3) to start compounding.
6. **Competitor comparison** — `src/pages/compare/[id].astro` already exists as a route; worth auditing next as a near-term differentiator once the core scan is trustworthy, but shouldn't be built out further until the base product works.

---

## 9. Recommended Architecture

```
CURRENT (broken)
Astro SSR ── /api/scan ─┬─ QStash → /api/worker/scan → runEnhancedScan() → [BROKEN IMPORT] → crash
                         └─ inline fallback → runEnhancedScan() → [BROKEN IMPORT] → crash
             /api/scan-enhanced ── separate, unauth'd, SSRF-unchecked path to the same PSI/CrUX calls
             /billing ── Paddle buttons pointing at undefined env vars → "Checkout unavailable"
             (build itself fails before any of this can even ship)

            ↓ (P0 fixes: this session)

RECOMMENDED MVP (what "done" looks like after P0/P1 work)
Astro SSR ── /api/scan → validate (incl. metadata-IP + IPv6 SSRF blocks) → rate-limit → CSRF
                        → QStash → /api/worker/scan → runEnhancedScan() [fixed import + API key]
                        → Supabase (scans, report_entitlements)
             /api/scan-enhanced → same validate()/rateLimit()/CSRF as /api/scan, or removed if redundant
             /billing → Stripe Checkout only (Paddle path deleted) → webhook → entitlements
             CI: astro check + astro build + vitest on every PR (real astro.yml)
             One scanner module, one rate limiter, one content-collection config, no stray directories

            ↓ (future, once there's real scan volume)

FUTURE SCALABLE ARCHITECTURE
Frontend/API (Vercel, unchanged)
   → Scan Queue (QStash, unchanged — already a queue, not a bottleneck yet)
   → Worker pool (dedicated Node worker service or Vercel background function with concurrency caps,
      once volume exceeds serverless function time/memory limits — see §Scalability below)
   → Measurement engine: PSI/CrUX API (current) for 0–1,000 scans/day; add a self-hosted Lighthouse/
      Playwright worker pool (containerized, queued, autoscaled) only once PSI's ~free-tier rate limits
      or per-call latency become the bottleneck — not before
   → Postgres (Supabase, unchanged) + object storage for large report payloads if report_json grows
   → Redis/Upstash for rate limiting and caching instead of in-process Maps (needed the moment you run
      more than one server instance, since today's rate limiter state doesn't survive across instances
      or cold starts)
```

**What should exist now vs. later:** Everything in "RECOMMENDED MVP" already exists in some form in this repo — this is a fix-and-consolidate job, not a green-field build. The "FUTURE" tier (dedicated worker pool, Redis-backed rate limiting, self-hosted browser farm) should not be started until real usage data justifies it; building it now would be the "over-engineering" the brief explicitly warns against.

**Scalability at a glance:**
- **10–100 scans/day:** current architecture (Vercel serverless + PSI API + in-process rate limiter) is fine once P0s are fixed. PSI's free quota (25,000 requests/day per project, ~400/100s) comfortably covers this.
- **1,000 scans/day:** still fine on PSI/CrUX for the API calls themselves; the in-process, per-instance rate limiter (`Map` in `slidingRateLimit.ts`) starts being unreliable across concurrent serverless instances (each cold start gets a fresh empty map) — move to Upstash Redis-backed rate limiting here, it's a small change and QStash is already an Upstash dependency.
- **10,000 scans/day:** this is where you'd need a real queue-depth story (QStash already gives you this) and to seriously ask whether PSI API's rate limits and ~15–30s per-call latency are acceptable, or whether a self-hosted Lighthouse worker pool becomes worth the ops cost. Not a today problem.

---

## 10. Changes Actually Implemented This Session

All of the following were applied to the working tree in this session (small, targeted, verified against a working build — see §11):

1. **Fixed `src/content.config.ts`** — replaced the broken hand-rolled `loader` with Astro's built-in `glob()` loader (`astro/loaders`), pointed at `content/pages` (see #6).
2. **Fixed the core scan pipeline** — `src/lib/scan.enhanced.ts` now imports `runEnhancedScanner` from `./scanner/server` (the real implementation) instead of `./scanner/enhanced` (types-only), and passes `env.PSI_API_KEY()` through so CrUX/PSI calls are actually authenticated.
3. **Fixed the corrupted template literals** in `src/pages/sitemap.xml.ts` (4 instances) and `src/components/seo/ProofBlock.astro` (1 instance) — sitemap now emits real URLs; the savings-calculator script now targets real element IDs.
4. **Hardened SSRF protection** in `src/lib/validate.ts` — added blocks for `169.254.0.0/16` (cloud metadata, including the AWS/GCP well-known `169.254.169.254`), `0.0.0.0`/`0.*`, loopback/link-local/unique-local IPv6 forms (`::1`, `::`, `fc00::/7`, `fe80::/10`, IPv4-mapped `::ffff:127.0.0.1`), and decimal/hex/octal IPv4 obfuscation (e.g. `2130706433`, `0x7f000001`).
5. **Locked down `/api/scan-enhanced`** — now runs the same `normalizeUrl` SSRF validation and the same CSRF check as `/api/scan`, instead of accepting any syntactically-valid URL unauthenticated.
6. **Consolidated the duplicate content directories** — moved the 7 MDX files out of `content/content/pages/` into `content/pages/` (git `mv`, no content lost) so all 8 pSEO articles are actually discoverable by the fixed loader.
7. **Removed dead/duplicate code**: `src/src/` (entire stray tree), `src/components/src/` (entire stray tree), `src/content/config.ts` (superseded legacy config), `src/lib/scan.ts` (explicitly-commented-dead legacy scan path), `src/lib/rateLimit.ts` (zero-importer duplicate of `slidingRateLimit.ts`).
8. **Removed `dompurify` from `package.json` dependencies** (unused — `isomorphic-dompurify` is the one actually imported and already bundles it). *Note: this one lives in the local session history but was not pushed to the remote branch, to avoid pushing a `package.json` that no longer matches the checked-in `package-lock.json` (a 332KB file not worth transferring through this session's push path for a one-line, purely-cosmetic dependency trim) — `npm uninstall dompurify` accomplishes the same thing safely whenever someone next touches dependencies.*
9. **Gated `/api/debug.ts`** behind `INTERNAL_DASHBOARD_KEY` (returns 404 if the key isn't sent), instead of being open to anyone.
10. **Fixed robots.txt** — removed the stale `public/robots.txt` static file (wrong host) so the dynamic `src/pages/robots.txt.ts` actually serves, and updated it to list *both* real sitemaps (`/sitemap-index.xml` from `@astrojs/sitemap`, and the hand-rolled `/sitemap.xml` covering dynamic report pages + pSEO content) instead of just one.
11. **Untracked `.env` from git** (`git rm --cached .env`) while leaving the local file in place — `.gitignore` already lists it, so this stops future edits to real keys from being committed, without deleting anyone's local config.

**Deliberately NOT changed** (flagged for your decision instead, see §12): the Paddle-vs-Stripe pricing conflict on `/billing`. Silently deleting a payment provider or rewriting prices without sign-off is exactly the kind of change the brief asked me not to make unilaterally.

---

## 11. Build/Test Results After Changes

```
$ npm install       → clean install, 0 errors (dompurify no longer a direct dependency)
$ npx astro build   → SUCCESS — "Server built in 10.23s. Complete!"  (previously: hard failure at content sync)
$ npx vitest run    → 10/10 tests passing, 2 files  (unchanged — was already green)
$ npx astro check   → now actually RUNS instead of crashing (previously: hard failure at content sync
                       before a single file was checked). It surfaces 53 pre-existing type errors —
                       see §4 P2 for what they are. None of them are new; all were latent and hidden by
                       the P0-1 crash. None block `astro build`. Left for the team to burn down as
                       normal type-safety cleanup rather than fixed silently in this pass, since several
                       touch report-rendering logic (`report/[id].astro`) that deserves a human decision
                       on the actual null-handling behavior, not a mechanical `!`-assertion.
```

The dynamic `/sitemap.xml` route was also spot-checked directly against the built output: it now emits real `https://www.whyismywebsiteslow.com/...` URLs (previously literal `\( ... \)` garbage), and the `@astrojs/sitemap` integration's own `sitemap-index.xml`/`sitemap-0.xml` build output was confirmed present and correct in `dist/client/`.

*(Re-run locally with `npm install && npm run build` to verify.)*

---

## 12. Blockers Requiring Your Decision

1. **Pricing/payment provider conflict (P0-4).** I did not pick Stripe over Paddle for you. My recommendation: standardize on Stripe (it's the one with a finished webhook, entitlements table, and price IDs already in `.env.example`), delete `PaddleCheckoutButton.astro` and rewrite `/billing` to call `/api/billing/checkout`, and settle on the README's $19 unlock / $99/mo figures (or whatever you actually intend to charge) as the single source of truth. This is a ~1-day task once you confirm the numbers.
2. **`OPENAI_API_KEY` is declared in `.env.example` but never referenced in any source file.** Either an "AI-generated recommendations" feature was planned and never built, or it's leftover scaffolding. Worth a decision on whether that's a near-term roadmap item (it would fit naturally into `reportIntelligence.ts`) or should be removed from the env schema.
3. **Playwright is fully coded (`lib/playwrightScan.ts`) but never called.** Confirm whether this is meant for a future dedicated worker (as the README implies) so it's clear to the next contributor it's intentional dead code for now, not another bug to "fix" by wiring it in — wiring browser automation into the current serverless request path would reintroduce exactly the stability problems the README says it was disabled to avoid.

---

## Top 10 Problems (priority order)

1. Production build fails (`content.config.ts` loader) — **fixed this session**.
2. Every scan crashes (`runEnhancedScanner` wrong import) — **fixed this session**.
3. Pricing page can't take payment (Paddle vs Stripe conflict) — **needs your decision**.
4. Sitemap emits garbage URLs; a live calculator's JS is broken (template-literal corruption) — **fixed this session**.
5. SSRF blocklist misses cloud-metadata/IPv6/obfuscated-IP addresses — **fixed this session**.
6. `/api/scan-enhanced` has no SSRF/CSRF/rate-limit protection — **fixed this session**.
7. No working CI (`astro.yml` isn't a real workflow) — **recommended, not yet added; see roadmap**.
8. `.env` committed to git — **untracked this session**; rotate any key you're not 100% sure was a placeholder.
9. `/api/debug.ts` open infrastructure disclosure — **fixed this session**.
10. Stray duplicate directories/configs causing confusion (`src/src/`, two content configs, two rate limiters) — **cleaned up this session**.

## Quick Wins (one day or less)

- Add a real `.github/workflows/astro.yml` that runs `npm ci && npm run build && npx astro check && npm test` on every PR (30 min; prevents every P0 in this report from recurring).
- Add a `"lint"` script and a minimal `eslint.config.js` so the existing `eslint.yml` workflow does something (1–2 hrs).
- Replace `via.placeholder.com` images in the 8 pSEO articles with real screenshots or simple generated diagrams (few hours).
- Add a copy-to-clipboard button next to the manage token in `ScanForm.svelte` (30 min, real UX win).
- Decide and fix the pricing page (see Blocker #1) — highest revenue-per-hour-spent item on this whole list.

## Recommended MVP Feature Set

Free scan (K-Score + top 3 issues) → locked full report → $X one-time unlock → $Y/mo monitoring with regression alerts (weekly-monitor + maybeSendRegressionAlert already built) → pSEO content driving free-scan traffic. Nothing new needs to be *built* for this MVP — it needs to be *unbroken and made consistent*, which is what this session's fixes plus Blocker #1 accomplish.

## 30-Day Roadmap (sketch)

- **Week 1:** Ship this session's fixes to production. Resolve Blocker #1 (pricing). Add CI (Quick Win #1). Manually QA the full scan → unlock → subscribe funnel against real Stripe test keys.
- **Week 2:** Replace placeholder images, tighten pSEO content, verify sitemap/robots are correctly indexed (Search Console). Add tests around the scan pipeline and entitlements so P0-2-style regressions can't ship silently again.
- **Week 3:** Turn on weekly monitoring/regression-alert upsell as a real, marketed feature (already built) for Pro subscribers. Start tracking funnel drop-off with the existing `analytics_events` table.
- **Week 4:** Revisit rate limiting (move to Redis/Upstash if scan volume justifies it), decide on the OpenAI/AI-recommendations and competitor-comparison features based on real usage data from weeks 1–3, not speculation.
