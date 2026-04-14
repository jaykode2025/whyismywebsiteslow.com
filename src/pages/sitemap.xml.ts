
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { listPublicReports } from "../lib/reports";
import { getSitemapUrls } from "../lib/sitemap";

const staticRoutes = [
  "/",
  "/scan",
  "/about",
  "/api",
  "/fix/ttfb",
  "/fix/lcp",
  "/fix/render-blocking-css",
];

export const GET: APIRoute = async ({ request, locals }) => {
  const base = import.meta.env.SITE 
    ? new URL(import.meta.env.SITE).origin 
    : new URL(request.url).origin;

  const reportsMap = await listPublicReports(locals);
  const reports = Array.from(reportsMap.values())
    .flatMap((entry) => (entry.status === "done" && entry.report ? [entry.report] : []));

  // NEW: Auto-pull ALL your PSEO pages from content collection
  const pseoPages = await getCollection("pages");

  const seoUrls = getSitemapUrls();

  const urls = [
    // Static pages - high priority
    ...staticRoutes.map((path) => ({
      loc: `\( {base} \){path}`,
      lastmod: new Date().toISOString(),
      priority: "1.0",
      changefreq: "daily",
    })),

    // PSEO pages (the new long-tail pages we're adding today)
    ...pseoPages.map((page) => ({
      loc: `\( {base}/ \){page.slug}`,
      lastmod: page.data.pubDate ? new Date(page.data.pubDate).toISOString() : new Date().toISOString(),
      priority: "0.8",
      changefreq: "weekly",
    })),

    // Your existing SEO URLs from lib
    ...seoUrls.map((url) => ({
      loc: `\( {base} \){url.url}`,
      lastmod: new Date().toISOString(),
      priority: "0.7",
      changefreq: "weekly",
    })),

    // Dynamic public reports
    ...reports.map((report) => ({
      loc: `\( {base}/report/ \){report.id}`,
      lastmod: report.createdAt,
      priority: "0.6",
      changefreq: "daily",
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (entry) =>
      `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <priority>${entry.priority}</priority>
    <changefreq>${entry.changefreq}</changefreq>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};