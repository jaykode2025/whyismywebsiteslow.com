# Content Cluster Plan — WhyIsMyWebsiteSlow.com

**Date:** 2026-08-22. Builds on the 8 existing guides (now live at `/guides/`) and the gaps identified in `SEO_AUDIT.md`/`SEO_KEYWORD_MAP.md`. Recommendations only below - nothing in this document has been built; it's the roadmap for what to write next, in order.

**Ground rule (per explicit product direction):** quality over volume. The 150-page templated "issue-N" pattern already shows real thin-content risk (`SEO_AUDIT.md` §4) - every page recommended below should be written like the 8 existing guides (specific, real, has an opinion), not generated from a fill-in-the-blank template.

---

## Tier 1 — High Commercial Intent (visitors actively trying to solve a problem *right now*)

These are the closest to a scan/purchase - prioritize first.

| # | Primary keyword | Recommended URL | Parent hub | Links to | Links from | Primary CTA |
|---|---|---|---|---|---|---|
| 1 | WooCommerce checkout slow after plugin update | `/guides/woocommerce-checkout-slow-plugin-update` | WordPress hub | `woocommerce-cart-page-slow` (existing), WordPress hub | WordPress hub, guides index | Embedded scan |
| 2 | Shopify slow on mobile | `/guides/shopify-slow-on-mobile` | Shopify hub | `shopify-store-slow-after-theme-update` (existing), Shopify hub | Shopify hub, guides index | Embedded scan |
| 3 | why is my Squarespace site slow after adding a gallery/video block | `/guides/squarespace-slow-after-adding-media` | *no platform hub - links to general hub* | `why-is-my-squarespace-site-slow` (existing) | General hub, guides index | Embedded scan |

**Why these three first:** each pairs with an *existing* guide to finally give the Shopify, WordPress, and Squarespace nodes real sibling links (currently the weakest nodes in the graph - see `INTERNAL_LINK_MAP.md` §4), while targeting a genuinely different, specific trigger event (not a rehash of the existing article).

## Tier 2 — High Problem Intent (searching for causes and fixes, not yet mid-checkout-crisis)

| # | Primary keyword | Recommended URL | Parent hub | Target audience | Primary CTA |
|---|---|---|---|---|---|
| 4 | reduce unused JavaScript | `/fix/unused-javascript` | Core Web Vitals hub (see Tier 3, #7) | Developers, technical site owners | Scan CTA |
| 5 | how to fix cumulative layout shift | `/fix/cls` | Core Web Vitals hub | Developers | Scan CTA |
| 6 | third party scripts slowing down website (GTM, chat widgets, analytics) | `/guides/third-party-scripts-slowing-website` | General hub | Marketing-adjacent site owners (this audience doesn't know it's "JS" - plain-English framing matters) | Scan CTA |

**Why these next:** #4 and #5 mirror the exact pattern of the two fix pages that already exist and work (`/fix/lcp`, `/fix/ttfb`) - cheapest possible pages to build well since the template is proven. #6 fills a real audience gap (non-technical site owners who don't know their chat widget is the culprit) that nothing on the site currently addresses in plain English.

## Tier 3 — Educational Authority (Core Web Vitals and technical topics)

| # | Page | Recommended URL | Notes |
|---|---|---|---|
| 7 | **Core Web Vitals hub** | `/core-web-vitals/` | Highest-priority gap identified in `SEO_KEYWORD_MAP.md` Cluster B. Should link to all three fix pages (`/fix/lcp`, the new `/fix/cls`, and a new `/fix/inp`) plus `/scan`. This is the one genuinely missing *hub* (not just an article) - build it before more articles, since #4/#5/#8 all want a parent to link to. |
| 8 | how to improve INP | `/fix/inp` | Completes the LCP/CLS/INP fix-page trio alongside #5 |
| 9 | web fonts slowing down your website | `/guides/font-loading-performance` | Real gap, no page today (`SEO_KEYWORD_MAP.md` Cluster F) |

## Tier 4 — Programmatic SEO opportunities (only where each page can be genuinely unique)

**Recommendation: none right now.** Every candidate we considered either (a) duplicates a cluster already covered by the existing 150-page `pseo.ts` system, or (b) would repeat the "issue-N" thin-content pattern already flagged as a real risk in `SEO_AUDIT.md`. The one legitimate programmatic gap - dedicated Squarespace and WooCommerce problem pages, since neither platform exists in `PLATFORMS` today - is better served by 2-3 more hand-written guides (Tier 1 style) than a templated batch, given both are meaningfully different platforms with their own failure modes that a generic template wouldn't capture well.

If programmatic expansion is revisited later, the bar should be: **can this specific combination say something a human couldn't tell was auto-generated?** The `platform × industry` combo pages already in production largely clear that bar (they use real per-platform/per-industry data, not filler); the 80 "issue-N" pages do not.

---

## Recommended build order (next 10 pages)

1. Core Web Vitals hub (#7) - unblocks #5/#8 and gives Cluster B a real home
2. `/fix/cls` (#5)
3. `/fix/inp` (#8)
4. WooCommerce checkout slow after plugin update (#1)
5. Shopify slow on mobile (#2)
6. Squarespace slow after adding media (#3)
7. Reduce unused JavaScript (#4)
8. Third-party scripts slowing website (#6)
9. Web fonts slowing website (#9)
10. *(Held for a decision, not auto-built)* - a second Next.js guide, once there's a second candidate topic distinct enough from `next-js-app-slow-first-load` to not cannibalize it

## Recommended next 30 (after the above 10 ship)

Grouped by the same discipline - real content, not templates:
- 3-5 more industry-specific angles for existing platform pain points (e.g. "Shopify slow during a product launch" - ecommerce-specific urgency, distinct from the generic theme-update guide)
- A "how we score your report" explainer page (builds trust in the product itself, supports the "not just a PageSpeed wrapper" positioning from `PRODUCT-DOCTRINE.md`)
- 2-3 comparison pages (this tool vs. PageSpeed Insights vs. GTmetrix) - directly answers the "why use this instead of X" question `PRODUCT-DOCTRINE.md` identifies as core positioning, and doesn't exist anywhere on the site today
- Remaining Core Web Vitals depth: a "Core Web Vitals for [Shopify/WordPress]" pairing once the general hub (#7) is live and has traffic data to justify platform-specific spinoffs
