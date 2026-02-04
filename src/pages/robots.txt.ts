import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  const base = import.meta.env.SITE ? new URL(import.meta.env.SITE).origin : new URL(request.url).origin;
  const body = `User-agent: *\nDisallow: /r/\nDisallow: /api/\nAllow: /\nSitemap: ${base}/sitemap.xml\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
};
