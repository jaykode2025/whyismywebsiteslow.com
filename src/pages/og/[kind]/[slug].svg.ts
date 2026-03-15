import type { APIRoute } from "astro";
import { INDUSTRIES, PLATFORMS, PROBLEMS } from "../../../data/pseo";
import {
  buildIndustryProofDataset,
  buildPlatformProofDataset,
  buildProblemProofDataset,
} from "../../../lib/proof";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const renderSvg = (title: string, score: number, metrics: Array<{ label: string; value: string }>) => {
  const safeTitle = escapeXml(title);
  const safeMetrics = metrics
    .slice(0, 3)
    .map(
      (metric, index) => `
      <g transform="translate(0, ${index * 52})">
        <text x="64" y="0" fill="#94a3b8" font-size="18" font-family="ui-sans-serif, system-ui">${escapeXml(metric.label)}</text>
        <text x="64" y="26" fill="#e2e8f0" font-size="28" font-family="ui-sans-serif, system-ui" font-weight="700">${escapeXml(metric.value)}</text>
      </g>
    `
    )
    .join("");

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1120" />
        <stop offset="50%" stop-color="#172554" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <radialGradient id="glow" cx="20%" cy="10%" r="80%">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" />
    <rect width="1200" height="630" fill="url(#glow)" />
    <rect x="48" y="48" width="1104" height="534" rx="30" fill="rgba(15,23,42,0.55)" stroke="rgba(148,163,184,0.25)" />
    <text x="64" y="120" fill="#93c5fd" font-size="20" font-family="ui-sans-serif, system-ui" letter-spacing="4">WHY IS MY WEBSITE SLOW</text>
    <text x="64" y="190" fill="#f8fafc" font-size="54" font-family="ui-sans-serif, system-ui" font-weight="700">${safeTitle}</text>
    <text x="64" y="250" fill="#cbd5e1" font-size="26" font-family="ui-sans-serif, system-ui">Performance proof snapshot</text>
    <g transform="translate(0, 320)">
      ${safeMetrics}
    </g>
    <g transform="translate(860, 138)">
      <rect x="0" y="0" width="250" height="250" rx="125" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.45)" />
      <text x="125" y="116" text-anchor="middle" fill="#e2e8f0" font-size="24" font-family="ui-sans-serif, system-ui">Score</text>
      <text x="125" y="172" text-anchor="middle" fill="#22d3ee" font-size="76" font-family="ui-sans-serif, system-ui" font-weight="700">${score}</text>
    </g>
  </svg>
`;
};

export const GET: APIRoute = async ({ params }) => {
  const kind = params.kind ?? "";
  const slug = params.slug ?? "";

  let title = "Website speed proof";
  let score = 72;
  let metrics: Array<{ label: string; value: string }> = [
    { label: "LCP", value: "3.1s" },
    { label: "INP", value: "260ms" },
    { label: "CLS", value: "0.16" },
  ];

  if (kind === "problem") {
    const entry = PROBLEMS.find((item) => item.slug === slug);
    if (!entry) return new Response("Not found", { status: 404 });
    const proof = buildProblemProofDataset(entry);
    title = entry.h1;
    score = proof.caseStudy.afterScore;
    metrics = proof.keyMetrics;
  } else if (kind === "platform") {
    const platform = PLATFORMS.find((item) => item.platform === slug);
    if (!platform) return new Response("Not found", { status: 404 });
    const platformIssues = PROBLEMS.filter((item) => item.platform === platform.platform).map((item) => item.issueTitle);
    const proof = buildPlatformProofDataset(platform, platformIssues);
    title = platform.keyword;
    score = proof.caseStudy.afterScore;
    metrics = proof.keyMetrics;
  } else if (kind === "industry") {
    const industry = INDUSTRIES.find((item) => item.industry === slug);
    if (!industry) return new Response("Not found", { status: 404 });
    const issueTitles = PROBLEMS.filter((item) => item.industry === industry.industry).map((item) => item.issueTitle);
    const proof = buildIndustryProofDataset(industry, issueTitles);
    title = industry.keyword;
    score = proof.caseStudy.afterScore;
    metrics = proof.keyMetrics;
  } else {
    return new Response("Not found", { status: 404 });
  }

  return new Response(renderSvg(title, score, metrics), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
