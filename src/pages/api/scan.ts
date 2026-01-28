import { randomUUID } from "node:crypto";
import type { APIRoute } from "astro";
import { createReportPlaceholder, setReport, setReportStatus } from "../../lib/store";
import { rateLimit } from "../../lib/rateLimit";
import { normalizeUrl, clampLinks } from "../../lib/validate";
import { runScan } from "../../lib/scan";

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const normalized = normalizeUrl(body.url);
    const hostKey = normalized.hostname;
    const ipKey = clientAddress ?? "unknown";
    const bucket = rateLimit(`${ipKey}:${hostKey}`);

    if (!bucket.ok) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const device = body.device === "desktop" ? "desktop" : "mobile";
    const maxLinks = clampLinks(body?.crawl?.maxLinks ?? 0);
    const crawlEnabled = Boolean(body?.crawl?.enabled && maxLinks > 1);
    const visibility = body.visibility === "public" ? "public" : "unlisted";

    const writeToken = randomUUID();
    const { id, writeTokenHash } = createReportPlaceholder(
      {
        url: normalized.toString(),
        device,
        crawl: { enabled: crawlEnabled, maxLinks: Math.max(1, maxLinks) },
        visibility,
      },
      writeToken
    );

    setReportStatus(id, "queued");

    setTimeout(async () => {
      try {
        setReportStatus(id, "running");
        const report = await runScan(id, {
          url: normalized.toString(),
          device,
          crawl: { enabled: crawlEnabled, maxLinks: Math.max(1, maxLinks) },
          visibility,
        }, writeTokenHash);
        setReport(id, report);
      } catch (error: any) {
        setReportStatus(id, "failed", error?.message ?? "Scan failed");
      }
    }, 10);

    return new Response(JSON.stringify({ id, manageToken: writeToken }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
