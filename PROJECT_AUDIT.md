# Project Audit — WhyIsMyWebsiteSlow.com

**Date:** 2026-08-22
**Scope:** Full-stack architecture, security, UX, SEO, and business audit, plus a first pass of P0/P1 fixes.

---

## 1. Executive Summary

This is a real, working Astro 7 + Svelte + Supabase + Stripe application, not a prototype. `npm run build`, `npx tsc --noEmit`, and `npm test` all pass cleanly. The core loop — submit a URL, get a scan (CrUX real-user data + Google's hosted PageSpeed API + in-house HTML/SEO checks), see a report, pay to unlock the full report — works end-to-end today.

Three things were quietly broken in ways that cost real money or created real risk, and have been fixed in this pass:

1. **The pricing page's "Upgrade" buttons were almost certainly dead.** They pointed at a Paddle checkout that was never configured (no env vars, no webhook), while a fully-working Stripe subscription endpoint sat unused. **Fixed** — `/billing` now uses Stripe end-to-end.
2. **The scanner's SSRF protection had real gaps.** A validated public URL that redirected to an internal address (including the cloud metadata IP, `169.254.169.254`) would be followed silently. **Fixed** — redirects are now re-validated hop-by-hop, and the address blocklist covers link-local, `0.0.0.0`, and decimal-IP encodings.
3. **8 real articles (WordPress/Shopify/Next.js speed content) were written but invisible.** They lived in a misplaced directory and the site's content collection silently returned zero entries at build time. **Fixed** — they're now live at `/guides/`, wired into the internal link graph, with a working embedded scanner.

Everything else in this report is either already fixed (see §10) or documented as a prioritized recommendation, per explicit instruction not to over-build before the first paying customers exist.

---

## 2. Architecture

```
Frontend (Astro islands + Svelte)
  src/pages/**            → routes, incl. src/pages/api/** for JSON/webhook endpoints
  src/components/**        → ui/, seo/, billing removed (Paddle deleted)
  src/layouts/BaseLayout   → shared shell, meta/OG/canonical, header/footer

Scan pipeline
  POST /api/scan  →  validate URL (src/lib/validate.ts)
                  →  rate-limit by ip:host (in-memory, src/lib/slidingRateLimit.ts)
                  →  Supabase+QStash configured? queue job → POST /api/worker/scan
                     else run synchronously, store to .data/reports.json (local/dev only)
  runEnhancedScan (src/lib/scan.enhanced.ts)
                  →  runEnhancedScanner (src/lib/scanner/enhanced.ts): CrUX + Google PSI API
                     in parallel, all via the now SSRF-hardened fetchWithRetry
                  →  runChecks (src/lib/checks.ts): HTML/meta/header checks on the fetched page
                  →  SEO analysis + image audit + scoring (kscore.ts / scoring.ts)
  Playwright (src/lib/playwrightScan.ts) is an intentional no-op stub - disabled for
  serverless stability per .env.example, zero live call sites. No real browser-based
  measurement happens today; everything goes through Google's hosted PSI API + plain fetch.

Reports
  /report/[id]            → SSR page, gates full content behind isReportUnlocked()
                             (per-report entitlement, not per-user - shareable-link model)
  /report/example         → hardcoded always-unlocked demo, works correctly

Auth            Supabase Auth only (signInWithPassword/signUp/signOut), session via
                @supabase/ssr cookies, resolved every request in src/middleware.ts.
                Protected pages redirect server-side (real, not client-side-only).

Billing         Stripe only (Paddle removed this session). Subscriptions:
                /billing → POST /api/billing/checkout → Stripe Checkout Session →
                webhook (signature-verified, idempotent via stripe_webhook_events) →
                subscriptions table → getUserPlan()/isPro() gates access.
                One-time report unlock: report-checkout.ts → same webhook →
                report_entitlements table → isReportUnlocked().

Database        Supabase Postgres. RLS enabled and real for profiles/projects/
                subscriptions. scans/report_entitlements have anon+authenticated
                SELECT revoked outright - server (service-role) code is the sole
                gatekeeper for report content, by design.

Background jobs QStash-triggered worker/scan.ts (scan execution), worker/follow-up.ts,
                worker/weekly-monitor.ts (regression alerts for paid "monitoring" plan).
                No cron schedules this exist anywhere (no vercel.json). Preserved as-is
                per explicit instruction - zero paying monitoring subscribers today,
                not worth building scheduling infrastructure yet.

External APIs   Google CrUX API, Google PageSpeed Insights API (optional key),
                Stripe, Supabase, Upstash QStash, Resend (alert emails, optional).

Deployment      Vercel, @astrojs/vercel adapter, output: "server".
```

---

## 3. What Is Working

- Production build, typecheck, and unit tests all pass clean.
- Free scan → report → Stripe one-time unlock → webhook → entitlement is a real, correctly-wired flow (signature verification + idempotency both present and correct).
- Auth is fully delegated to Supabase (no custom password handling); protected pages gate server-side.
- RLS is genuinely configured, not cosmetic, for the tables that use it.
- `/report/example` demo path works.
- ~394 programmatic SEO pages (100+ problem pages × platform/industry/location combinations) build successfully with per-page unique title/description/canonical and real JSON-LD (breadcrumb, FAQ, Article).
- 219 static pages generate correctly at build time.

## 4. What Is Broken (ranked by severity, before this session's fixes)

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | `/billing` upgrade buttons non-functional (Paddle, unconfigured) | **High** (revenue) | **Fixed** |
| 2 | SSRF: redirects not re-validated; `169.254.0.0/16`/`0.0.0.0` unblocked | **High** (security) | **Fixed** |
| 3 | `/api/debug` fully unauthenticated, leaks infra/env presence | **High** (security) | **Fixed** |
| 4 | 8 real articles orphaned - content collection silently empty | **High** (lost SEO work) | **Fixed** |
| 5 | Two conflicting `robots.txt` sources | **Medium** | **Fixed** |
| 6 | `ScanProgress.svelte` polls forever, no timeout state | **Medium** (UX) | **Fixed** |
| 7 | JSON-LD `logo`/`contactPoint` pointed at a 404 / fabricated phone number | **Medium** | **Fixed** |
| 8 | `weekly-monitor.ts` worker exists but nothing schedules it | Medium, but **zero paying subscribers today** | Documented, not built (§9) |
| 9 | `.env` with placeholder values committed to git history | Low (verified no real secret) | Documented, deferred (§9) |
| 10 | 3 pSEO/content systems not integrated with each other | Medium (content debt) | Documented (§7, §9) |
| 11 | In-memory rate limiting doesn't work across serverless instances | Medium | Documented (§9) |
| 12 | `npm audit`: 3 high transitive advisories (`@astrojs/vercel`→`path-to-regexp`) | Low-Medium | Documented (§9) |

---

## 5. Security Risks

**CRITICAL:** None found and still open.

**HIGH (now fixed):**
- SSRF via redirect-following to internal/metadata addresses - `src/lib/retry.ts` now fetches with `redirect: "manual"` and re-validates every hop's hostname before following it (capped at 5 hops).
- SSRF blocklist gaps (`169.254.169.254` cloud metadata, `0.0.0.0`, decimal-IP encodings like `http://2130706433/`) - `src/lib/validate.ts` rewritten with a single `isBlockedHostname()` used both for submission-time validation and redirect re-validation.
- `/api/debug` unauthenticated info-disclosure - now 404s unless `INTERNAL_DASHBOARD_KEY` is configured and provided.

**MEDIUM (documented, not changed this session):**
- No DNS-rebinding protection: the fix above re-validates hostnames, not resolved IPs. A domain that resolves to a public IP at submission time and is re-pointed (short TTL) to an internal IP before the (possibly queued) scan executes would still get through. Closing this fully requires a custom DNS-pinned fetch dispatcher (e.g. an `undici.Agent` with a `lookup` override) - a real but more invasive change, left for a dedicated pass.
- In-memory rate limiting (`slidingRateLimit.ts`) is per-instance on Vercel's stateless functions - not an effective global limit in production. Only applied to `/api/scan`; auth/leads endpoints have none.
- CSRF protection is inconsistent across state-changing endpoints (present on `/api/scan` and report-checkout, absent on `report/[id]/delete`, `leads/*`).
- Non-constant-time comparisons for the QStash worker bearer token and the report manage-token hash (should use `timingSafeEqual` like `csrf.ts` does).
- `internal/funnel.astro` grants access to *any* logged-in user, not just admins.

**LOW:**
- `.env` with placeholder-only values sits in git history on `origin/main` (verified: every value matches `.env.example`'s placeholder text or is an obvious stub - no real secret to rotate). Recommended cleanup, not urgent.
- `npm audit`: 3 high-severity transitive advisories via `@astrojs/vercel` → `@vercel/routing-utils` → `path-to-regexp`. Fix requires bumping `@astrojs/vercel` to v8, a breaking change - needs a deliberate upgrade + retest cycle, not bundled into this pass.

---

## 6. Technical Debt

- **Astro content collections use the legacy `type: "content"` API**, which Astro 7 silently skips at build time unless `legacy.collectionsBackwardsCompat: true` is set (now set, with a comment explaining why). Recommended P2: migrate `src/content.config.ts` to the modern loader-based API (`loader: glob(...)`) and drop the compat flag, since it's a bridge, not a permanent feature.
- **`docs/ENHANCED-SCANNER.md`** is not documentation - it's a stale, full copy-paste of an old version of `src/lib/scanner/enhanced.ts`'s source code from before it was refactored to use `fetchWithRetry`. Misleading for anyone (human or AI) who reads it expecting prose docs; should be rewritten or deleted.
- **Confirmed dead code:** `src/lib/scan.ts` (superseded by `scan.enhanced.ts`, says so in its own comment), `src/lib/psi.ts` (superseded by `scanner/enhanced.ts`'s own PSI fetcher), `src/lib/rateLimit.ts` (superseded by `slidingRateLimit.ts`). Left in place this session (not blocking, removing them is a clean but non-urgent follow-up) — recommend deleting in the next pass along with `src/lib/scanner/enhanced.ts`'s duplicate PSI-parsing logic.
- **Three non-integrated pSEO/content systems**: `src/data/pseo.ts` (the live ~394-page system), a second root-level `[slug].astro` + `performance-datasets.json` system (2 entries, different theming/components), and the now-fixed `/guides/*` (8 hand-written articles). See `SEO_AUDIT.md` for the cannibalization detail.
- Within `pseo.ts`'s 150 problem-page dataset, roughly half (10 platforms × 8 "issue-N" slugs = 80 pages) are near-identical templated filler (`quickWins`, `statistics`, and sentence structure are copy-paste across every "issue-N" page for a platform, only the noun phrase changes) - a real thin-content risk, detailed in `SEO_AUDIT.md`.
- Repo hygiene: 3 overlapping AI-agent instruction docs (`agent.md`, `AGENTS.md`, `cursor.md`), several empty editor/agent tool-config directories, doc/config drift (`config/stripe/products-and-prices.sh` references env var names that don't match `src/lib/env.ts`).

---

## 7. UX Problems

- **Fixed this session:** infinite scan-progress polling with no timeout/fallback state (`ScanProgress.svelte`); dead-loop "Checkout unavailable" button on `/billing`; conflicting `robots.txt`.
- **`RecentScans.svelte`** falls back to fabricated example domains (`lawyersite.com`, `saassite.io`) with no "example data" label if its API call fails - presents fake social proof as real. Cheap fix, not done this session (cosmetic, not on the money path).
- **Manage token** is shown once in plaintext with no copy-to-clipboard button (inconsistent with `ManageReport`/`ShareActions`, which have one) - easy to lose a token that can delete the report.
- **Fix pages are cul-de-sacs**: `/fix/lcp`, `/fix/ttfb`, `/fix/render-blocking-css` have no CTA back to `/scan` and no related-links block.
- Root `[slug].astro` pages (the second pSEO system) and the platform hub pages both cover overlapping topics with different visual treatments - a real "which page am I on" inconsistency for anyone who lands on both.

---

## 8. Product Opportunities (ranked for MVP)

Per `PRODUCT-DOCTRINE.md` (already in the repo and a good source of truth - this audit validates the code against it rather than re-deriving strategy):

1. **Make the free→paid funnel convert before adding anything new.** The single highest-leverage fix this session was making the paid path actually work (Stripe wiring). Nothing else matters if that's broken.
2. **Recurring monitoring** is real, coded, and completely inert (no scheduler). This is the natural second revenue line once there's a paying base - re-activate `worker/weekly-monitor.ts` with a `vercel.json` cron the day the first monitoring customer signs up, not before.
3. **Guides/content** (`/guides/`) now function as a real acquisition surface with a working embedded scanner CTA on every article - the flywheel from "SEO content → free scan → paid report" described in the doctrine is now actually closed for these 8 pages instead of theoretical.
4. **Consolidating the pSEO systems** (see `SEO_AUDIT.md`) would meaningfully reduce thin-content/cannibalization risk before scaling to more programmatic pages - do this before writing hundreds more pages, not after.

---

## 9. Recommended Architecture

```
CURRENT (this session, after fixes)
  Astro SSR + Svelte islands → Stripe (sole billing) → Supabase (RLS + service-role
  gate for report content) → QStash-queued or sync scan → CrUX + Google PSI API +
  in-house checks → file store (dev) / Supabase (prod)

                              ↓ (next, once there's revenue to justify it)

RECOMMENDED MVP+ (when there are paying monitoring customers)
  Add: vercel.json cron → worker/weekly-monitor.ts (already written) → Resend alerts
  Add: Upstash Redis-backed rate limiting (replaces in-memory, works across instances)
  Add: DNS-pinned fetch dispatcher for full SSRF/rebinding closure
  Migrate: content.config.ts off the legacy collections flag

                              ↓ (future, once there's real usage data to justify it)

FUTURE SCALABLE
  Dedicated scan worker (real headless-browser measurement, replacing the
  Google-PSI-only lab data) behind a proper queue, separate from the web tier
  Competitor comparison / benchmark intelligence (the "moat" layer in doctrine)
  Consolidated single pSEO content system with a real content data model
```

---

## 10. Changes Actually Implemented This Session

**Security / reliability (P0):**
- `src/lib/validate.ts`: rewrote SSRF blocklist as a single `isBlockedHostname()` - fixed `169.254.0.0/16`, `0.0.0.0`, decimal-IP-encoding gaps; removed the over-broad blanket `172.*` block in favor of the precise `172.16.0.0–172.31.255.255` range.
- `src/lib/retry.ts`: `fetchWithRetry`/new `fetchSafely` now fetch with `redirect: "manual"` and re-validate each redirect hop's hostname before following (max 5 hops), instead of silently following redirects to internal/metadata addresses.
- `src/lib/checks.ts`: switched its fallback raw `fetch()` to the same hardened `fetchSafely`.
- `src/pages/api/debug.ts`: now 404s unless `INTERNAL_DASHBOARD_KEY` is configured, and 401s on a wrong key (header or `?key=`), matching the existing pattern in `internal/funnel.astro`.
- `src/components/ScanProgress.svelte`: added a 60-attempt (~2 min) polling cap with a friendly "taking longer than expected" state and manual "check again" action, instead of polling forever.
- Deleted the conflicting static `public/robots.txt` in favor of the correct dynamic `src/pages/robots.txt.ts` (disallows `/api/`, `/r/`; correct sitemap URL).
- Removed a stray 0-byte `echo` file at repo root.

**Billing (P1):**
- `src/pages/billing.astro`: replaced both Paddle checkout buttons with real forms posting to the existing (previously unused) `/api/billing/checkout` Stripe endpoint, gated correctly by auth state and current plan; added success/canceled banners.
- Deleted `src/components/billing/PaddleCheckoutButton.astro` (now unused).
- `src/pages/refunds.astro`: updated "such as Paddle" → "Stripe" to match reality.
- `.env.example`: corrected stale price comments ($12/mo → actual $29/mo Pro / $300/mo Enterprise) and documented that Stripe is the sole billing provider.
- **Verified:** webhook signature verification, idempotency (`stripe_webhook_events`), and price→plan mapping (`getPlanFromPriceId`) were already correct - no changes needed there.
- **Not verified (see Blockers, §12):** an actual live Stripe Checkout Session round-trip, since no real Stripe test keys are configured in this environment.

**SEO / content (P1):**
- Installed and wired `@astrojs/mdx` (was completely missing - `.mdx` content collections cannot work without it).
- Fixed `astro.config.mjs`: added `legacy.collectionsBackwardsCompat: true` (with an explanatory comment) - without it, Astro 7 silently skips the legacy `type: "content"` collection at build time with only a console warning, no error.
- Fixed `src/content.config.ts`: `pubDate` schema changed to `z.coerce.date()` (frontmatter had quoted date strings, which fail plain `z.date()`).
- Moved the 8 real articles from a misplaced root `content/` (and doubly-nested `content/content/`) directory into `src/content/pages/`, fixing a filename typo (`-on-moble` → `-on-mobile`) that would have shipped a typo'd URL.
- Added `platform` frontmatter field to each article and extended the schema, enabling real hub/sibling linking.
- Removed 24 unreliable hotlinked `via.placeholder.com` images (and their mistakenly-visible `*Alt: ...*` caption lines) from the 8 articles - external dependency risk, zero real content value.
- Created `src/components/seo/ArticleScanner.astro` - a working embedded free-scan CTA for article content (the articles already referenced `<Scanner client:load />`, but no such component existed and it can't take a client directive as an Astro-wrapper). Fixed and wired into all 8 articles.
- Created `src/pages/guides/[slug].astro` and `src/pages/guides/index.astro` - the actual render route that never existed for this content collection.
- Wired real internal links: each guide links to sibling guides on the same platform, the platform's hub page (`/website-speed-audit/platform/{platform}/`), and `/scan`/`/billing`; each platform hub page now links back to its guides (bidirectional hub↔article linking).
- Added `/guides` to the sitewide footer nav (prevents orphan status).
- Fixed `src/pages/sitemap.xml.ts`: corrected a **pre-existing bug** (`page.slug`, which doesn't exist on these entries - only `.id` does, and it includes the file extension) that would have produced broken sitemap URLs the moment the collection started returning real entries; added `/billing`, `/fix-it`, `/guides` to static routes; added the second pSEO system's dataset pages (previously absent from every sitemap source).
- Fixed `src/lib/seo.ts`: JSON-LD `logo` no longer points at a nonexistent `/logo.png` (now `/og-default.png`, which exists); removed a fabricated `+1-800-SPEED-AUDIT` phone number from `organizationSchema()`'s `contactPoint` rather than publish fake contact info in structured data.

**Monitoring / .env history (per explicit instruction):**
- No cron/scheduling infrastructure built - zero paying monitoring subscribers today, `worker/weekly-monitor.ts` preserved as-is and documented as ready to activate.
- No git-history rewrite performed - verified placeholder-only, documented as a deferred P2 cleanup.

---

## 11. Build/Test Results After Changes

```
npx tsc --noEmit   → 0 errors in app code (2 pre-existing errors in scripts/index-urls.mjs,
                      a .mjs file with TS-only syntax - unrelated to this session's changes,
                      not part of the Astro build)
npm run build      → succeeds, 0 errors. 219+8 static pages generate correctly, including
                      all 8 /guides/* pages with clean URLs (no .mdx in the path) and
                      correct titles/content/CTA (verified against dist/client output).
npm test (vitest)  → 10/10 tests pass (scoring.test.ts, validation.test.ts) - unchanged.
```

No lint script/config exists in this project (verified: no `.eslintrc*`, no lint entry in `package.json`) - nothing to run there.

**Not run in this environment:** `npx astro dev` / `npx astro preview` - Astro 7's new CLI daemon wrapper fails to become ready in this sandbox regardless of what code it's running (reproduced on a clean checkout before any changes were made, so this is a sandbox limitation, not a regression). Verification instead relied on the static build output (`dist/client/**`) plus direct source review. **Recommend a `vercel dev` or preview-deployment smoke test** of `/billing` (Stripe checkout redirect) and a couple of `/guides/*` pages before merging.

---

## 12. Blockers Requiring Your Decision

1. **Stripe live verification**: I could not exercise an actual Stripe Checkout Session round-trip (create → pay in test mode → webhook → entitlement) because no real `STRIPE_SECRET_KEY`/price IDs are configured in this environment. The code paths are verified correct by inspection (webhook signature check, idempotency, price→plan mapping all pre-existed and are sound), but per your own instruction I won't claim the full flow is "tested" until it's actually been run with real Stripe test keys. **Please run one real test-mode checkout** (or share test keys in a safe channel) before treating billing as launch-ready.
2. **DNS-rebinding closure**: left open, documented, not built - would need a custom fetch dispatcher. Let me know if you want that built now or want to keep it as a documented residual risk.
3. **Legacy content-collections flag**: `legacy.collectionsBackwardsCompat: true` unblocks the guides today but is explicitly a bridge in Astro 7, not a permanent feature. Fine to leave for now; flag it for a future migration to the loader-based API.

---

## 13. Session 2 — Account Basics

Added the account-management surface that didn't exist at all before (verified: no forgot-password, no settings page, no self-service billing management, no account deletion anywhere in the codebase prior to this).

**New pages:**
- `/forgot-password` - request a reset link. Always shows the same "check your email" result regardless of whether the address exists (no user-enumeration), and rate-limited.
- `/reset-password` - lands from the emailed link (`?code=...`), exchanges it for a real session server-side via `supabase.auth.exchangeCodeForSession`, then reuses the normal authenticated password-update endpoint - no separate "recovery" code path to maintain.
- `/account` - email, plan/status, "Manage billing" (Stripe customer portal, only shown once a Stripe customer exists) or "Upgrade plan" otherwise, change-email form, change-password form, and a delete-account flow requiring the user to type `DELETE` to confirm.

**New API routes:** `api/auth/forgot-password`, `api/account/update-email`, `api/account/update-password` (shared by both `/account` and `/reset-password`), `api/account/delete`, `api/billing/portal`. All CSRF-protected the same way existing state-changing routes are.

**Account deletion** cancels any active Stripe subscription first (best-effort), then deletes the Supabase auth user. DB cleanup relies on existing FK constraints rather than new code: `projects`/`subscriptions` cascade-delete, `scans.user_id` is set `NULL` (report content stays reachable by its share link - consistent with the per-report, not per-user, entitlement model documented in §2).

**Also fixed while in this area:** `/login` and `/signup` were silently swallowing their own `?error=` redirect param - a failed login/signup showed no error message at all. Both now render it. Consolidated three near-duplicate `sanitizeNextPath` implementations (login.ts, signup.ts, and now the new update-password.ts) into one `src/lib/safeRedirect.ts`.

**Verified:** `npx tsc --noEmit` (clean), `npm run build` (clean, same pre-existing warnings only), `npm test` (10/10). Not exercised live for the same reason as Stripe checkout in §12 - no real Supabase/Stripe credentials in this environment. The Stripe portal route (`api/billing/portal`) has the same "verified by inspection, not by a live call" caveat as the checkout flow.

**Not built (out of scope for this pass, per your prioritization):** admin dashboard (built next - see §14), re-verifying a current password before allowing a password change (Supabase's `updateUser` doesn't require it for an already-authenticated session - acceptable for MVP, worth revisiting if this becomes a compliance concern), and email notifications for these account events (no "your email was changed" confirmation email beyond Supabase's own).

---

## 14. Session 3 — Admin Dashboard

There was no admin dashboard and no admin *role* at all before this - `/internal/funnel` (funnel metrics) was the only internal page, and it granted access to **any logged-in user**, not just admins. Fixed as part of this pass.

**New migration** (`supabase/migrations/20260822010000_add_profiles_is_admin.sql`): adds `profiles.is_admin boolean default false`, with `UPDATE` on that specific column revoked from `anon`/`authenticated`. This matters: `profiles` already has a `profiles_update_own` policy (`auth.uid() = id`), and RLS controls *row* access, not *columns* - without the revoke, any logged-in user could have run `supabase.from('profiles').update({ is_admin: true })` on their own row and granted themselves admin. The column-level revoke closes that while leaving the rest of the row updatable as before. **Bootstrapping the first admin requires one manual SQL statement** (documented in the migration file) since there's no existing admin to grant the role - this is expected, not a gap.

**Second migration** (`...sync_profile_email_on_update.sql`): found while building this - `profiles.email` was only ever synced at signup (`on_auth_user_created`, `AFTER INSERT`). Last session's new "change email" feature (`/account`) calls `supabase.auth.updateUser({ email })`, which updates `auth.users.email` but never touched `profiles.email` - it would have silently gone stale the moment anyone used that feature, and the new admin user list reads `profiles.email` directly. Added an `AFTER UPDATE OF email` trigger reusing the existing upsert function.

**Access model** (`src/lib/adminAuth.ts`): admin access is granted by *either* the existing shared `INTERNAL_DASHBOARD_KEY` (works immediately, no admin user needed - same pattern already used by `/api/debug`) *or* a logged-in user with `profiles.is_admin = true`. A non-admin logged-in user gets a 404 (not a 403/redirect) to avoid confirming the admin area exists; a logged-out visitor gets redirected to log in.

**New pages:**
- `/admin` - total users, active subscribers, scans in the last 7 days, failed scans in the last 7 days (highlighted), and a recent-scans table linking into the report lookup below.
- `/admin/users` - search by email (or browse the most recent 25 signups), shows plan/status per user, "Cancel subscription" action (cancels on Stripe first, then reflects the status locally even if the Stripe call fails because it's already canceled).
- `/admin/reports` - look up any scan/report by ID, see its status/owner/entitlement state, "Force unlock" it, or "Refund & lock" it (retrieves the Stripe checkout session's payment intent and refunds it, then revokes the entitlement regardless of whether the Stripe refund call itself succeeded, since the admin explicitly asked to revoke access).

**New API routes:** `api/admin/cancel-subscription`, `api/admin/unlock-report`, `api/admin/refund-report` - all gated by `requireAdminApi` + CSRF, following the exact same pattern as every other state-changing route in the app.

**Also fixed:** `/internal/funnel.astro` now uses the same `requireAdminPage` gate instead of "any logged-in user."

**Verified:** `tsc --noEmit`, `npm run build`, `npm test` all pass clean.

**Not verified (same honesty caveat as §12/§13):** the two new migrations haven't been applied to a live database in this environment (no real Supabase credentials here) - run `npx supabase db push` and then manually set your own `is_admin = true` (SQL provided in the migration file) before the admin pages will show real data. The refund flow's actual Stripe API call is verified by inspection, not by a live test-mode refund.

**Explicitly not built, and worth knowing about:** mutating admin actions (cancel subscription, unlock, refund) are gated the same way *viewing* the dashboard is - via the shared key or `is_admin`. That's fine for one founder; the moment more than one person has the key, actions taken via the key aren't attributable to a specific person. If/when there's a real team, worth requiring a logged-in admin user (not the key) specifically for the mutating routes, so there's an audit trail of who did what.

---

## 15. Session 4 — Code and File Cleanup

**Deleted (confirmed zero remaining callers before removal, one real miss caught and fixed - see below):**
`src/lib/scan.ts`, `src/lib/psi.ts`, `src/lib/rateLimit.ts` (all superseded, see §6); the `TIER1` export in `src/data/pseo.ts` (dead, referenced nonexistent `/pricing/`, `/contact/` routes); `expanded-seo-data.json` (531KB, never imported by anything but its own orphaned generator script); `sql/001_init.sql` and `supabase/schemas/001_init.sql` (identical stale schema dumps predating the RLS-hardening migration - dangerous if ever reapplied directly, real source of truth is `supabase/migrations/*`); `agent.md` and `cursor.md` (redundant with `AGENTS.md`, which is the one actually referenced by tooling); the empty `.junie/skills/` and `.qwen/skills/` directories.

**Caught while deleting `psi.ts`:** `src/lib/scan.enhanced.ts` (the live scan path) had an unused `import { fetchPsi } from "./psi"` - a dead import that would have broken the build the moment `psi.ts` was removed. My first pass at verifying "zero callers" used a `grep` pattern (`lib/psi`) that missed this exact relative import (`./psi`, from a file already inside `src/lib/`) - caught by the actual build failing, not by the grep. Fixed by removing the unused import rather than restoring the dead file. Worth remembering: grep-based dead-code verification needs to account for relative imports from sibling files in the same directory, not just `lib/x`-style imports from elsewhere.

**Data bug fixed:** `src/data/pseo.ts`'s `PLATFORMS`, `INDUSTRIES`, and `LOCATIONS` arrays each had 6-10 duplicate entries appended (documented in `SEO_AUDIT.md` §4) - `INDUSTRIES`' duplicates additionally carried a copy-paste bug (wrong `keyword` field, all reading "for ecommerce"). Deduped all three to their correct unique counts (10 platforms, 9 industries, 13 locations) - live page content was already unaffected (`.find()` always resolved to the first, correct entry) but the duplicates were doubling `getStaticPaths()` build work for those routes.

**Security hardening:**
- The three QStash worker bearer-token checks (`worker/scan.ts`, `worker/follow-up.ts`, `worker/weekly-monitor.ts`) and the manage-token hash comparison in `report/[id]/delete.ts`'s local-store fallback path now use a new `timingSafeStringEqual()` (`src/lib/timingSafe.ts` - hashes both sides to a fixed-length digest first, so `crypto.timingSafeEqual` never throws on a length mismatch and the comparison time doesn't leak how much of the secret matched) instead of plain `!==`. The Supabase-backed path of that same route was already safe (the hash comparison happens as a DB query filter, not a JS string compare).
- Added real CSRF verification to `report/[id]/delete.ts` and `leads/service.ts` (both only ever called from SSR pages, so a live per-request token works) - wired `ManageReport.svelte` to send `X-CSRF-Token`, and added `_csrf` to `fix-it.astro`'s form.
- `leads/preview.ts` is called from both SSR pages *and* three statically-prerendered pSEO templates (`export const prerender = true`). A CSRF token baked into a page at build time would be identical for every visitor of that page - it can't provide real per-visitor CSRF protection, and enforcing it would have just broken those forms for everyone. Added `src/lib/sameOrigin.ts` instead - an Origin/Referer same-site check, which works regardless of whether the calling page is static or SSR. Weaker than a per-session token, but a real improvement over no check at all, and correctly scoped to what's actually possible given three of its five callers are prerendered.
- Fixed stale env var names in `config/stripe/products-and-prices.sh`/`README.md` (`STRIPE_PRICE_PRO_MONTHLY`/`STRIPE_PRICE_AGENCY_MONTHLY` → the names the code actually reads, `STRIPE_PRICE_PRO`/`STRIPE_PRICE_AGENCY`).

**Migrated off the legacy content-collections flag:** `src/content.config.ts` now uses the modern loader API (`loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' })`) instead of `type: "content"`, and `legacy.collectionsBackwardsCompat` was removed from `astro.config.mjs` entirely. Bonus: the modern loader's entry `.id` is already the extension-stripped slug (unlike the legacy API's `.id`, which kept `.mdx`), so the `.replace(/\.mdx?$/, "")` workarounds in `guides/[slug].astro`, `guides/index.astro`, the platform hub page, and `sitemap.xml.ts` were all removed as dead weight - verified via build output that URLs are still clean without them.

**Rewrote `docs/ENHANCED-SCANNER.md`:** it was a stale, full copy-paste of an old version of `src/lib/scanner/enhanced.ts`'s source code from before that file was refactored to use `fetchWithRetry` - not real documentation, and actively misleading about what the current implementation does (e.g. it no longer matched the real CrUX/PSI weighting or the SSRF-hardened fetch path). Replaced with prose docs describing the actual current behavior and its place in the pipeline.

**Verified:** `tsc --noEmit`, `npm run build`, `npm test` all pass clean - re-run after every deletion/migration, not just once at the end, specifically because the `psi.ts` deletion did break the build on the first attempt (see above).

**Explicitly not done this pass (documented, not silently skipped):** distributed (Redis-backed) rate limiting - requires a new infra decision (an Upstash Redis instance distinct from the existing QStash one) and env vars that don't exist yet, so it's a feature/infra addition, not a cleanup; DNS-rebinding SSRF closure (unchanged from §5); requiring a real admin user rather than the shared key for mutating admin actions (unchanged from §14).

---

## 16. Dependabot Alert Review (112 alerts on `main`)

GitHub reported 112 open Dependabot alerts (2 critical, 42 high, 56 medium, 12 low) on push. Pulled the full list via the GitHub API (`gh api repos/.../dependabot/alerts`) and cross-checked every one's actual `vulnerable_version_range` (proper semver range matching via the `semver` package, not string comparison) against the versions genuinely resolved in this branch's `package-lock.json`.

**Headline finding: 108 of the 112 were already fixed on this branch before this review started** - not because anyone deliberately patched them, but as an incidental side effect of running `npm install` when `@astrojs/mdx` was added in an earlier session (npm naturally re-resolved several transitive dependencies to newer semver-compatible versions in the process, including both packages behind the 2 *critical* alerts: `tar` 7.5.7→7.5.22 and `vitest` 3.2.4→3.2.7). **This is exactly why the alert count looked alarming: Dependabot alerts are computed against `main`, which still has the old, unpatched lockfile - they will not reflect this branch's fixes until it's merged.**

Breakdown of all 112:
- **108 fixed** - installed version on this branch is outside every alert's vulnerable range.
- **3 stale (`lodash`, 2 medium + 1 high)** - `lodash` isn't a dependency at all anymore on this branch (`npm ls lodash` returns nothing); these alerts simply no longer apply.
- **1 real, confirmed, still-present** - `path-to-regexp@6.1.0` (high, GHSA-9wv6-86v2-598j / CVE-2024-45296, ReDoS via backtracking regex), pulled in via `@astrojs/vercel@11.0.5` → `@vercel/routing-utils@5.3.3`. Already on the newest `@astrojs/vercel` (11.0.5) - the "upgrade to v8" fix suggested by the original `npm audit` finding in §5/§6 was based on stale guidance; even the latest major version still pulls this vulnerable transitive copy, so a version bump alone can't fix it.

**Fixed this pass:** added `"overrides": { "path-to-regexp": "^6.3.0" }` to `package.json`, forcing every copy in the tree to the patched version regardless of what `@vercel/routing-utils` itself requests (a same-major-version patch bump, low risk of breaking anything). `npm audit` now reports **0 vulnerabilities**. Verified `tsc --noEmit`, `npm run build`, and `npm test` all still pass with the override in place.

**Practical risk note, for context:** even before this fix, the path-to-regexp ReDoS is only exploitable if attacker-controlled input reaches path-to-regexp as a *route pattern to compile*, not as a request path to match against a pattern - `@vercel/routing-utils` uses it internally to process routing config, not arbitrary end-user input. Real-world exploitability here was low; fixing it was still the right call since it was a one-line, zero-risk change.

**Takeaway for future dependency work:** always check Dependabot/`npm audit` findings against what's actually resolved in the lockfile of the branch being evaluated, not just the advisory's headline severity - a routine `npm install` can silently fix (or introduce) far more than a targeted `npm audit fix` would suggest, and GitHub's alert list reflects whatever branch it's configured to scan (here, `main`), not the branch you're actually working on.

---

## 17. Session 5 — Closing Documented Gaps (revenue leaks, fake proof, real SSRF hole, admin accountability)

Follow-up pass fixing items this audit had previously flagged as documented-but-not-built, scoped to what's fixable in code/config alone (no live Stripe/Supabase/Vercel access in this environment - see the honesty caveat in §12/§13/§14, which still applies to anything below marked "not exercised live").

**Turned on the dormant monitoring cron (§4 item 8, §9):** `worker/weekly-monitor.ts` was fully built, correctly wired to Stripe/Supabase/Resend, and completely inert - nothing ever called it. Added `src/pages/api/cron/weekly-monitor.ts` (a `GET` entry point Vercel Cron can hit, gated by a timing-safe `CRON_SECRET` bearer check - Vercel's own convention) and `vercel.json` (`crons: [{ path: "/api/cron/weekly-monitor", schedule: "0 13 * * 1" }]`, weekly Monday 13:00 UTC). Documented `CRON_SECRET` in `.env.example` and `src/lib/env.ts`. **Not exercised live** - no real Vercel cron trigger in this environment; the wrapper's own auth logic mirrors the existing `worker/*.ts` bearer-token pattern exactly, so it's verified by inspection and consistency, not a live cron firing.

**Found and fixed a real SSRF gap bigger than the documented "DNS-rebinding" one (§5):** `isBlockedHostname()` only ever inspected the *hostname string* - it never resolved a domain name at all. That's not just the narrow DNS-rebinding TOCTOU case already documented; it meant an attacker-controlled domain with an A/AAAA record pointing straight at `169.254.169.254` (or any other private address) would pass both submission-time validation and every redirect-hop check untouched, no rebinding trickery required. Added `src/lib/dnsGuard.ts` (`assertResolvesToPublicAddress()`, using `node:dns`) and wired it into `src/lib/retry.ts`'s `fetchSafely` (before the initial fetch and before following each redirect hop - covers the entire scan pipeline in one place, since CrUX/PSI/HTML fetches all already flow through it) and into `src/pages/api/scan.ts` right after `normalizeUrl()` for fast, clear submission-time feedback. Also added IPv6 unique-local (`fc00::/7`, RFC 4193) to `isBlockedHostname()` itself - the IPv6 checks only covered loopback/link-local before. **Still open, deliberately not built:** true DNS-rebinding closure (a domain whose TTL expires and re-resolves to a private IP in the exact window between this lookup and the fetch layer's own independent DNS resolution) needs a DNS-pinned fetch dispatcher (custom `lookup`/`connect` override), which remains the larger, dedicated-pass item this audit already flagged it as.

**Found and fixed a real (unrelated) bug while in `api/scan.ts`:** its client-vs-server error classifier did `error.message.includes("url")` - case-sensitive, so the existing `"Internal URLs not allowed"` message (capital URL) never actually matched, meaning a rejected internal-URL submission was returning 500 instead of 400. Fixed by lowercasing before the check.

**Admin mutation accountability (§14's own "worth knowing about" item):** added `requireAdminMutation()` to `src/lib/adminAuth.ts` - unlike `requireAdminApi`/`requireAdminPage` (unchanged, still accept the shared `INTERNAL_DASHBOARD_KEY` for *viewing*), it accepts only a real logged-in `profiles.is_admin` user. Swapped it into the three mutating routes: `api/admin/cancel-subscription.ts`, `api/admin/unlock-report.ts`, `api/admin/refund-report.ts`. `unlock-report.ts` also now stamps the acting admin's user id into the existing `stripe_session_id` text field (`admin-override:<user id>` instead of a bare `"admin-override"`) for a minimal audit trail without a schema change. Viewing the dashboard via the shared key still works as before (useful pre-bootstrap); only mutations now require a real admin identity.

**Fake social proof (§7):** `RecentScans.svelte` fell back to fabricated domains (`lawyersite.com`, `saassite.io`, ...) on a fetch failure, rendered identically to real activity with no distinguishing label. Replaced with an honest "Couldn't load recent audits" empty state - no invented data.

**Fix-page dead ends (§7):** `/fix/lcp`, `/fix/ttfb`, `/fix/render-blocking-css` had no path back into the funnel. Added the existing `ArticleScanner` embedded scan CTA (already used on all 8 `/guides/*` articles) plus cross-links between the three fix pages to each of them - closes the "problem → diagnosis → solution" loop the product doctrine describes for a surface that previously dead-ended.

**Manage-token copy button (§7):** the one-time manage token shown after a scan (`ScanForm.svelte`) had no copy-to-clipboard, inconsistent with `ShareActions`/`ScanProgress`, which both have one for their own tokens/links. Added the same pattern (copy button, "Copied" feedback state, "Clipboard unavailable" fallback).

**Verified:** `npx tsc --noEmit` (0 errors beyond the pre-existing, unrelated `scripts/index-urls.mjs` ones noted in §11), `npm run build` (clean), `npm test` (11/11 - added a test for the new IPv6 unique-local block in `validation.test.ts`).

**Explicitly not done this pass, and why:** distributed Redis-backed rate limiting (new infra decision, not a fix to existing code - unchanged from §9); consolidating the three pSEO systems (§6, §8 - a content/product redesign call, not a quick fix); a real Stripe Checkout / Supabase Auth live round-trip smoke test (no real credentials in this sandbox, same caveat as every prior session); per-action audit *table* for admin mutations beyond the one text-field stamp above (would need a schema migration - the access-gate fix is the load-bearing part of this item, a dedicated audit-log table is a reasonable future addition, not a gap in what shipped here).
