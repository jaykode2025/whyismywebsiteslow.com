/**
 * EMBEDDABLE "SCANNED BY" BADGE
 *
 * A compact SVG a site owner can drop on their own site after a good scan,
 * linking back to their public report. Every embed is a free backlink and
 * a bit of social proof for us - see ShareActions.svelte for the copyable
 * <a><img></a> snippet shown on the report page.
 *
 * Only served for reports that are done and public - same gate the report
 * page itself uses for indexing (report.visibility === "public"), so this
 * never exposes a private report's score to a third party embedding it.
 */
import type { APIRoute } from "astro";
import { loadStoredReport } from "../../lib/reports";
import { exampleReport } from "../../lib/example";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function scoreColor(score: number) {
  if (score >= 90) return { fg: "#022c22", accent: "#34d399" };
  if (score >= 70) return { fg: "#451a03", accent: "#fbbf24" };
  return { fg: "#4c0519", accent: "#fb7185" };
}

function renderBadge(host: string, grade: string, score: number) {
  const { accent } = scoreColor(score);
  const safeHost = escapeXml(host.length > 28 ? host.slice(0, 25) + "..." : host);
  const width = 236;
  const height = 54;
  const splitX = 150;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Speed score ${grade}, ${score} out of 100 for ${safeHost}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#05070d" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="10" fill="url(#g)" stroke="rgba(255,255,255,0.12)" />
  <rect x="${splitX}" y="0" width="${width - splitX}" height="${height}" rx="10" fill="${accent}" opacity="0.16" />
  <line x1="${splitX}" y1="8" x2="${splitX}" y2="${height - 8}" stroke="rgba(255,255,255,0.12)" />
  <text x="16" y="21" fill="#64748b" font-family="ui-sans-serif, system-ui, -apple-system" font-size="10" letter-spacing="1.4" font-weight="600">SPEED SCORE</text>
  <text x="16" y="40" fill="#e2e8f0" font-family="ui-sans-serif, system-ui, -apple-system" font-size="15" font-weight="600">${safeHost}</text>
  <text x="${splitX + (width - splitX) / 2}" y="26" text-anchor="middle" fill="${accent}" font-family="ui-sans-serif, system-ui, -apple-system" font-size="20" font-weight="700">${escapeXml(grade)}</text>
  <text x="${splitX + (width - splitX) / 2}" y="42" text-anchor="middle" fill="${accent}" font-family="ui-sans-serif, system-ui, -apple-system" font-size="11" font-weight="600" opacity="0.85">${score}/100</text>
</svg>`;
}

function unavailableBadge() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="236" height="54" viewBox="0 0 236 54" role="img" aria-label="Report unavailable">
  <rect width="236" height="54" rx="10" fill="#0f172a" stroke="rgba(255,255,255,0.12)" />
  <text x="16" y="31" fill="#64748b" font-family="ui-sans-serif, system-ui, -apple-system" font-size="13">Report unavailable</text>
</svg>`;
}

export const GET: APIRoute = async ({ params }) => {
  const id = params.id ?? "";
  const report = id === "example" ? exampleReport() : (await loadStoredReport(id, {} as any))?.report;

  if (!report || report.visibility !== "public") {
    return new Response(unavailableBadge(), {
      status: 404,
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" },
    });
  }

  const svg = renderBadge(report.canonicalHost, report.summary.grade, report.summary.score100);
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      // Reports are immutable snapshots once done, so this is safe to cache hard.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
};
