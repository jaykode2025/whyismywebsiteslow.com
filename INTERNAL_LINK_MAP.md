# Internal Link Map — WhyIsMyWebsiteSlow.com

**Date:** 2026-08-22. Verified against actual code (`src/lib/related.ts`, `src/pages/website-speed-audit/platform/[slug].astro`, `src/pages/guides/[slug].astro`, `src/components/SiteFooter.astro`), not aspirational.

---

## 1. Site structure (verified, not all hubs recommended by a generic template - see note below)

```
                              HOMEPAGE (/)
                                   |
              ┌────────────────────┼─────────────────────┐
              |                    |                      |
   WEBSITE SPEED HUB      WEBSITE SPEED AUDIT HUB      GUIDES INDEX
   (/why-is-my-website-    (/website-speed-audit/)      (/guides/)
    slow/)                        |                      |
        |               ┌─────────┼─────────┐            |
   150 problem      10 platform  9 industry  13 location  8 hand-written
   pages (templated)  hubs        hubs        pages       articles
        |               |          |                       |
        └──── cross-links ─────────┴── (relatedForX in src/lib/related.ts)
                                   |
                          90 platform×industry
                             combo pages
                                   |
                                   ▼
                              /scan (tool)
                                   |
                                   ▼
                          /report/{id} (result)
                                   |
                                   ▼
                       /billing (subscription) or
                       report-checkout (one-time unlock)
```

**Note on hub structure**: the user's suggested hub set (`/wordpress-speed/`, `/shopify-speed/`, `/nextjs-performance/`, etc.) is **not** what this codebase uses - and building those as *new, separate* pages would create a fourth pSEO system on top of the three already documented in `SEO_AUDIT.md`. The existing `/website-speed-audit/platform/{slug}/` pages already serve exactly that hub role (per-platform issue lists, fix guidance, `ScanBox`, `RecentScans`). This map treats those as the real WordPress/Shopify/Next.js hubs rather than recommending duplicates.

---

## 2. Linking pattern per page type (described once, applies to all pages of that type)

### Problem pages (150×) — `src/pages/why-is-my-website-slow/[slug].astro`
Powered by `relatedForProblem()` (`src/lib/related.ts`):
- **Parent hub**: linked via breadcrumb to `/why-is-my-website-slow/` and to the platform hub (`/website-speed-audit/platform/{platform}/`, score 9).
- **Siblings**: other problem pages scored by keyword-token overlap + same-platform bonus (+4) + same-industry bonus (+3).
- **Cross-cluster**: links to the platform's industry hub (score 8) and 2 location pages (score 4, "spiderweb" links).
- **Tool links**: `/scan` (score 11, highest-weighted link on the page) and `/billing` (score 7).
- Renders top 5 by score via `RelatedLinks`.

### Platform hub pages (10×) — `src/pages/website-speed-audit/platform/[slug].astro`
- **Receives** from: every problem page for that platform (`relatedForProblem`'s hub link), and now (fixed this session) every guide article tagged with that `platform`.
- **Links to** (fixed this session): its own guide articles first (`guideLinks`, prepended - real, hand-written content gets priority placement over templated content), then `relatedForPlatform()`'s top 5 (own problem pages, an industry hub, `/scan`, `/billing`).

### Industry / location / combo pages
Same `relatedForX()` pattern as problem pages - siblings by overlap score, hub links, `/scan`/`/billing` tool links. Not modified this session; verified working as designed.

### Guides (8×) — `src/pages/guides/[slug].astro` (new this session)
Explicit graph below (small enough to enumerate in full, unlike the 150-page templated set).

---

## 3. Guides — full explicit graph (all 8, new this session)

```
/guides/                                        (index - links to all 8)
│
├── why-is-my-wordpress-site-slow-on-mobile.mdx   [platform: wordpress]
├── divi-theme-making-wordpress-slow.mdx          [platform: wordpress]
├── elementor-making-wordpress-slow-fix.mdx       [platform: wordpress]
├── too-many-plugins-making-wordpress-slow.mdx    [platform: wordpress]
├── woocommerce-cart-page-slow.mdx                [platform: wordpress]
├── shopify-store-slow-after-theme-update.mdx     [platform: shopify]
├── next-js-app-slow-first-load.mdx               [platform: nextjs]
└── why-is-my-squarespace-site-slow.mdx           [platform: none - squarespace isn't in PLATFORMS]
```

**Each WordPress guide** (5 of them):
- Links to → 3 sibling WordPress guides (same-platform filter, capped at 3) + WordPress platform hub's `relatedForPlatform` output (own problem pages, industry hub, `/scan`, `/billing`)
- Receives links from → `/website-speed-audit/platform/wordpress/` (prepended to that page's related-links block), `/guides/` index, sitewide footer, each other

**The Next.js and Shopify guides** (1 each): same pattern, but only 0 sibling guides on the same platform exist yet (only 1 guide per platform) - they link to their platform hub + `/scan` + `/billing` instead. **This is a real weak spot** - see §4.

**The Squarespace guide**: `platform` isn't set (Squarespace has no `pseo.ts` entry), so it falls back to generic links: `/why-is-my-website-slow/` hub, `/scan`, `/billing`. No sibling, no platform hub. **Weakest node in the new set** - see §4.

**Embedded tool link** (every guide): `<Scanner />` renders a real, working scan form (`ArticleScanner.astro` → `ScanForm.svelte`) inline in the article body, not just a text link - the strongest possible tool-link placement, present on all 8.

---

## 4. Orphans, weak pages, and depth (verified, not estimated)

| Finding | Detail |
|---|---|
| **Orphans before this session** | All 8 guides (fixed - see `PROJECT_AUDIT.md` §10) |
| **Orphans after this session** | None found in the guide/hub/problem-page graph. `expanded-seo-data.json`'s content remains orphaned (never rendered by any route) - not a page, so not a "page orphan," but worth noting as dead data. |
| **Weakest pages (fewest inbound links)** | The Next.js and Shopify guides (1 platform-sibling each = 0 sibling links) and the Squarespace guide (no platform match = generic links only). All three still get 3 guaranteed inbound links (footer, `/guides/` index, their platform hub or the general hub) - not orphaned, but thin. **Recommended**: the next 2-3 articles written (see `CONTENT_CLUSTER_PLAN.md`) should target Shopify, Next.js, and Squarespace specifically, to give these pages real siblings. |
| **Pages with too many outbound links** | None found - `RelatedLinks` components across the codebase consistently cap at 4-6 items. |
| **Redirect chains** | None found in the codebase (no redirect logic beyond the canonical-host middleware redirect, which is a single hop). |
| **Duplicate URLs** | None literal (the `INDUSTRIES`/`PLATFORMS` data-duplication bug in `SEO_AUDIT.md` §4 produces duplicate *build* work, not duplicate *URLs* - `.find()` always resolves to the same first-match content). |
| **Broken internal links** | None found via source inspection of link-generating code (`related.ts`, `RelatedLinks.astro` usages) - all hrefs are built from the same slug/platform/industry data used to generate `getStaticPaths`, so a link and its target are generated from the same source of truth and can't drift independently. The one prior exception (`TIER1`'s `/pricing/`, `/contact/`) is dead code, never rendered - see `SEO_AUDIT.md`. |
| **Pages buried too deep** | `/scan` and `/billing` (the two commercial pages) are reachable in **1 click** from literally every content page on the site (guides, problem pages, hubs) via the tool-link pattern above - this is a real strength, not a gap. Guides are 1 click from home (footer) and 2 from any problem page (via their platform hub). |

---

## 5. Anchor text used today (verified from actual code, not invented)

Destination `/scan`, observed anchor variants already in use across the codebase (no single repeated exact-match phrase dominates):
- "Run Another Scan" (platform hub CTA)
- "Run another speed scan" (`related.ts` candidates)
- "Scan your site free" (billing page)
- "Run a free speed scan" (guides fallback links)
- Embedded scan form itself (guides) - the strongest signal, not text at all

Destination `/billing`:
- "Start monitoring" (`related.ts`)
- "Start monitoring your site" (guides fallback)
- "Upgrade to Pro" (variation-tested CTA)

This is already reasonably varied - no over-optimized exact-match anchor pattern found. No change made; noted for awareness when adding future links.
