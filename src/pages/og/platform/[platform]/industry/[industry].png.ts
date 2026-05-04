/**
 * PNG OG IMAGE FOR PLATFORM/INDUSTRY COMBINATION PAGES
 *
 * Example: /og/platform/shopify/industry/lawyers.png
 */

import type { APIRoute } from "astro";
import sharp from "sharp";
import { PLATFORMS, INDUSTRIES } from "../../../../../data/pseo";
import { buildIndustryProofDataset } from "../../../../../lib/proof";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const renderSvg = ({
  platform,
  industry,
  score,
  metrics,
}: {
  platform: string;
  industry: string;
  score: number;
  metrics: Array<{ label: string; value: string }>;
}) => {
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  const industryName = industry.charAt(0).toUpperCase() + industry.slice(1);

  const bgStart = "#022c22";
  const primary = "#34d399";
  const secondary = "#2dd4bf";
  const scoreColor = score >= 90 ? "#34d399" : score >= 70 ? "#fbbf24" : "#fb7185";
  const scoreGlow = score >= 90 ? "rgba(52,211,153,0.3)" : score >= 70 ? "rgba(251,191,36,0.3)" : "rgba(251,113,133,0.3)";

  const safeMetrics = metrics
    .slice(0, 3)
    .map(
      (metric, index) => `
      <g transform="translate(64, ${340 + index * 70})">
        <text x="0" y="0" fill="#94a3b8" font-size="18" font-family="ui-sans-serif, system-ui, -apple-system">${escapeXml(metric.label)}</text>
        <text x="0" y="32" fill="#e2e8f0" font-size="34" font-family="ui-sans-serif, system-ui, -apple-system" font-weight="700">${escapeXml(metric.value)}</text>
      </g>
    `
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgStart}" />
        <stop offset="60%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${primary}" />
        <stop offset="100%" stop-color="${secondary}" />
      </linearGradient>
      <radialGradient id="glow" cx="20%" cy="10%" r="80%">
        <stop offset="0%" stop-color="${primary}" stop-opacity="0.3" />
        <stop offset="100%" stop-color="${primary}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" />
    <rect width="1200" height="630" fill="url(#glow)" />
    <rect x="40" y="40" width="1120" height="550" rx="36" fill="rgba(15,23,42,0.6)" stroke="url(#accent)" stroke-width="3" />
    <text x="64" y="110" fill="${primary}" font-size="18" font-family="ui-sans-serif, system-ui, -apple-system" letter-spacing="3" font-weight="600">PLATFORM + INDUSTRY AUDIT</text>
    <text x="64" y="175" fill="#f8fafc" font-size="44" font-family="ui-sans-serif, system-ui, -apple-system" font-weight="700">${escapeXml(`${platformName} for ${industryName}`)}</text>
    <text x="64" y="225" fill="#94a3b8" font-size="22" font-family="ui-sans-serif, system-ui, -apple-system">Performance benchmarks and common issues</text>
    ${safeMetrics}
    <g transform="translate(880, 180)">
      <circle cx="110" cy="110" r="110" fill="${scoreGlow}" />
      <circle cx="110" cy="110" r="95" fill="rgba(15,23,42,0.8)" stroke="${scoreColor}" stroke-width="4" />
      <text x="110" y="95" text-anchor="middle" fill="#94a3b8" font-size="18" font-family="ui-sans-serif, system-ui, -apple-system">Score</text>
      <text x="110" y="155" text-anchor="middle" fill="${scoreColor}" font-size="72" font-family="ui-sans-serif, system-ui, -apple-system" font-weight="700">${score}</text>
    </g>
    <text x="64" y="570" fill="#475569" font-size="14" font-family="ui-sans-serif, system-ui, -apple-system">whyismywebsiteslow.com</text>
  </svg>`;
};

export const GET: APIRoute = async ({ params }) => {
  const platform = params.platform ?? "";
  const industry = params.industry ?? "";

  const platformData = PLATFORMS.find((p) => p.platform === platform);
  const industryData = INDUSTRIES.find((i) => i.industry === industry);

  if (!platformData || !industryData) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const proof = buildIndustryProofDataset(industryData, platformData.topIssues);

    const svgString = renderSvg({
      platform: platformData.platform,
      industry: industryData.industry,
      score: proof.caseStudy.afterScore,
      metrics: proof.keyMetrics,
    });

    const pngBuffer = await sharp(Buffer.from(svgString))
      .png()
      .toBuffer();

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("PNG OG image generation error:", error);
    return new Response("Error generating image", { status: 500 });
  }
};
