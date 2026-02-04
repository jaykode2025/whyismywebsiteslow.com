import type { APIRoute } from "astro";
import { listPublicReports } from "../lib/reports";

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
  const base = import.meta.env.SITE ? new URL(import.meta.env.SITE).origin : new URL(request.url).origin;
  const reportsMap = await listPublicReports(locals);
  const reports = Array.from(reportsMap.values()).flatMap((entry) => (entry.status === "done" && entry.report ? [entry.report] : []));

  const urls = [
    ...staticRoutes.map((path) => ({
      loc: `${base}${path}`,
      lastmod: new Date().toISOString(),
    })),
    ...reports.map((report) => ({
      loc: `${base}/report/${report.id}`,
      lastmod: report.createdAt,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map(
        (entry) =>
          `\n  <url><loc>${entry.loc}</loc><lastmod>${entry.lastmod}</lastmod></url>`
      )
      .join("") +
    "\n</urlset>";

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
};
