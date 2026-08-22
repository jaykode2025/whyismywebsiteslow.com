# SEO Keyword Map — WhyIsMyWebsiteSlow.com

**Date:** 2026-08-22. No search-volume, ranking, or difficulty data is claimed anywhere in this document - everything here is intent classification and page-mapping only, grounded in the site's actual existing content (verified against `src/data/pseo.ts` and `src/content/pages/`). Where a cell says "no page yet," that's a real, verified gap (see `CONTENT_CLUSTER_PLAN.md` for prioritized recommendations).

Funnel: **Organic search → helpful content or free tool → website scan → actionable report → premium upgrade/monitoring.**

---

## Cluster A — Website Speed (general)

| Primary Keyword | Secondary Keywords | Long-Tail Keywords | Search Intent | Target URL | Page Type | Funnel Stage | CTA |
|---|---|---|---|---|---|---|---|
| website speed test | site speed test, website performance test | how to test website speed, free website speed test | Transactional | `/scan` | Tool | Product-aware | Run a free scan |
| why is my website slow | slow website, website loading slowly | why is my website loading slowly, what is slowing down my website, how to find out why my website is slow | Problem-aware / Informational | `/why-is-my-website-slow/` (hub) + 150 problem pages under it | Hub + Diagnosis | Problem-aware | Run a scan / read specific cause |
| website optimization | website performance, speed up my website | how to speed up my website | Commercial investigation | *no dedicated hub - covered piecemeal across problem pages* | Gap | Solution-aware | See `CONTENT_CLUSTER_PLAN.md` T3 |
| website loads fast on desktop but slow on mobile | mobile site speed | why is my site slow on mobile only | Problem-aware | `/guides/why-is-my-wordpress-site-slow-on-mobile/` (WordPress-specific only) | Guide | Problem-aware | Scan CTA in-article |

## Cluster B — Core Web Vitals

| Primary Keyword | Secondary Keywords | Long-Tail Keywords | Search Intent | Target URL | Page Type | Funnel Stage | CTA |
|---|---|---|---|---|---|---|---|
| Core Web Vitals | page experience, CWV | Core Web Vitals test, how to pass Core Web Vitals | Informational/Commercial | *no dedicated hub - real gap* | Gap | Awareness→Solution-aware | See `CONTENT_CLUSTER_PLAN.md` T3, top priority |
| LCP / largest contentful paint | slow LCP | how to improve largest contentful paint, why is my LCP slow | Problem-aware | `/fix/lcp` | Fix page | Solution-aware | Scan CTA |
| CLS / cumulative layout shift | layout shift | how to fix cumulative layout shift | Problem-aware | *no dedicated fix page - gap* | Gap | Solution-aware | See content plan |
| INP / interaction to next paint | responsiveness | how to improve INP | Problem-aware | *no dedicated fix page - gap* | Gap | Solution-aware | See content plan |
| TTFB / server response time | slow server response | how to reduce TTFB, why is server response slow | Problem-aware | `/fix/ttfb` | Fix page | Solution-aware | Scan CTA |
| render blocking resources | render blocking CSS/JS | how to fix render blocking resources | Problem-aware | `/fix/render-blocking-css` | Fix page | Solution-aware | Scan CTA |

## Cluster C — WordPress Performance

| Primary Keyword | Secondary Keywords | Long-Tail Keywords | Search Intent | Target URL | Page Type | Funnel Stage | CTA |
|---|---|---|---|---|---|---|---|
| why is my WordPress site slow | WordPress speed, slow WordPress | how to speed up a WordPress website | Problem-aware | `/website-speed-audit/platform/wordpress/` (hub) | Hub | Problem-aware | Scan CTA in ScanBox |
| too many WordPress plugins slowing down site | WordPress plugin bloat | WordPress site slow after installing plugin | Problem-aware, high intent | `/guides/too-many-plugins-making-wordpress-slow/` **(primary target - see cannibalization note in `SEO_AUDIT.md`)** vs. `/why-is-my-website-slow/why-is-my-wordpress-site-slow-plugin-bloat/` (secondary) | Guide (primary) + templated page (secondary) | Problem-aware→Solution-aware | Embedded scan CTA |
| WordPress slow on mobile | mobile WordPress speed | why is my WordPress site slow on mobile | Problem-aware | `/guides/why-is-my-wordpress-site-slow-on-mobile/` | Guide | Problem-aware | Embedded scan CTA |
| Divi theme slow | Divi performance | Divi theme making WordPress slow | Problem-aware, niche/low-competition | `/guides/divi-theme-making-wordpress-slow/` | Guide | Problem-aware | Embedded scan CTA + Rocket.net affiliate |
| Elementor slow | Elementor performance | Elementor making WordPress slow fix | Problem-aware, niche/low-competition | `/guides/elementor-making-wordpress-slow-fix/` | Guide | Problem-aware | Embedded scan CTA + Rocket.net affiliate |
| WooCommerce slow | WooCommerce cart slow, WooCommerce checkout speed | why is my WooCommerce cart page slow | Problem-aware, high commercial value (checkout page) | `/guides/woocommerce-cart-page-slow/` | Guide | Problem-aware→ready-to-buy (checkout is revenue-critical) | Embedded scan CTA |
| WordPress database slowing down website | WordPress DB optimization | how to optimize WordPress database | Problem-aware | *no page - gap* | Gap | Solution-aware | See content plan |
| WordPress slow admin dashboard | wp-admin slow | why is my WordPress dashboard slow | Problem-aware, niche | *no page - gap* | Gap | Solution-aware | See content plan |

## Cluster D — Shopify Performance

| Primary Keyword | Secondary Keywords | Long-Tail Keywords | Search Intent | Target URL | Page Type | Funnel Stage | CTA |
|---|---|---|---|---|---|---|---|
| why is my Shopify store slow | Shopify speed, slow Shopify store | how to speed up Shopify store | Problem-aware | `/website-speed-audit/platform/shopify/` (hub) | Hub | Problem-aware | Scan CTA |
| Shopify theme slowing down website | Shopify slow after theme update | why is my Shopify store slow after theme update | Problem-aware, high intent (recent-change trigger = high urgency) | `/guides/shopify-store-slow-after-theme-update/` | Guide | Problem-aware→ready-to-buy | Embedded scan CTA |
| Shopify apps slowing down store | Shopify app bloat | too many Shopify apps slow | Problem-aware | `/why-is-my-website-slow/why-is-my-shopify-site-slow-app-script-overload/` | Templated page | Problem-aware | Scan CTA |
| Shopify slow on mobile | mobile Shopify speed | why is my Shopify store slow on mobile | Problem-aware | *no dedicated page - covered generically only* | Gap | Problem-aware | See content plan |

## Cluster E — Next.js Performance

| Primary Keyword | Secondary Keywords | Long-Tail Keywords | Search Intent | Target URL | Page Type | Funnel Stage | CTA |
|---|---|---|---|---|---|---|---|
| why is my Next.js website slow | Next.js performance | how to speed up Next.js website | Problem-aware | `/website-speed-audit/platform/nextjs/` (hub) | Hub | Problem-aware | Scan CTA |
| Next.js slow initial page load | Next.js first load | Next.js app slow on first load | Problem-aware, developer audience | `/guides/next-js-app-slow-first-load/` | Guide | Problem-aware→Solution-aware | Embedded scan CTA |
| Next.js bundle too large | Next.js bundle size | reduce Next.js JS bundle | Solution-aware, developer audience | `/why-is-my-website-slow/why-is-my-nextjs-site-slow-uncached-api-routes/` (adjacent, not exact) | Templated page | Solution-aware | Scan CTA |

## Cluster F — Specific performance problems (cross-platform)

| Sub-topic | Primary Keyword | Search Intent | Target URL | Page Type | Gap? |
|---|---|---|---|---|---|
| Images | large images slowing website | Problem-aware | Covered inside problem pages (`due-to-large-images` variants exist per-platform) | Templated page | No dedicated cross-platform hub |
| JavaScript | reduce unused JavaScript, render blocking JavaScript | Solution-aware | `/fix/render-blocking-css` (CSS only - no JS equivalent) | Fix page | **Gap**: no "reduce unused JavaScript" fix page |
| CSS | render blocking CSS, unused CSS | Solution-aware | `/fix/render-blocking-css` | Fix page | Partially covered |
| Server/TTFB | high TTFB, slow server response | Solution-aware | `/fix/ttfb` | Fix page | Covered |
| Fonts | web fonts slowing website, font loading performance | Solution-aware | *no page* | Gap | **Gap** |
| Caching | browser caching, cache headers | Solution-aware | Covered inside problem pages (`due-to-poor-caching` variants) - no standalone fix page | Templated page | Partial gap |
| Third-party scripts | Google Tag Manager slowing website, third party JavaScript performance | Solution-aware | *no page* | Gap | **Gap** |

---

## Notes on prioritization

The highest-value, lowest-effort gaps to close first (per `CONTENT_CLUSTER_PLAN.md`): a **Core Web Vitals hub** (Cluster B has real search intent and zero dedicated hub today), a **fix page for unused/render-blocking JavaScript** (mirrors the existing, working `/fix/render-blocking-css` and `/fix/ttfb` pattern almost exactly), and **CLS/INP-specific fix pages** (same pattern, currently only LCP has one of the three Core Web Vitals covered).

Do not build the Squarespace/WooCommerce/font-loading/third-party-script pages as programmatic templates the way the 150 problem pages were built - the templated "issue-N" pattern already shows real thin-content risk (see `SEO_AUDIT.md` §4). Any new page in a content gap should be written with real, specific content the way the 8 guides were, not generated from a generic template.
