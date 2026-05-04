/**
 * PNG OG IMAGE GENERATOR
 *
 * Generates dynamic social preview images as PNG for:
 * - Industry pages (indigo theme)
 * - Platform pages (emerald theme)
 * - Problem pages (amber theme)
 * - Report pages (score-based color)
 */

import type { APIRoute } from "astro";
import sharp from "sharp";
import { INDUSTRIES, PLATFORMS, PROBLEMS } from "../../../data/pseo";
import {
  buildIndustryProofDataset,
  buildPlatformProofDataset,
  buildProblemProofDataset,
} from "../../../lib/proof";
import { loadStoredReport } from "../../../lib/reports";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Theme colors per page type
const themes = {
  industry: {
    primary: "#818cf8",    // indigo-400
    secondary: "#c084fc",  // purple-400
    bgStart: "#312e81",    // indigo-950
    bgEnd: "#0f172a",      // slate-950
    accent: "#e0e7ff",     // indigo-100
  },
  platform: {
    primary: "#34d399",    // emerald-400
    secondary: "#2dd4bf",  // teal-400
    bgStart: "#022c22",    // emerald-950
    bgEnd: "#0f172a",      // slate-950
    accent: "#d1fae5",     // emerald-100
  },
  problem: {
    primary: "#fbbf24",    // amber-400
    secondary: "#fb923c",  // orange-400
    bgStart: "#451a03",    // amber-950
    bgEnd: "#0f172a",      // slate-950
    accent: "#fef3c7",     // amber-100
  },
  report: {
    good: { primary: "#34d399", secondary: "#2dd4bf", bgStart: "#022c22" },
    medium: { primary: "#fbbf24", secondary: "#fb923c", bgStart: "#451a03" },
    bad: { primary: "#fb7185", secondary: "#f43f5e", bgStart: "#4c0519" },
  },
};

const getScoreColor = (score: number) => {
  if (score >= 90) return themes.report.good;
  if (score >= 70) return themes.report.medium;
  return themes.report.bad;
};

const renderSvg = ({
  title,
  subtitle,
  score,
  metrics,
  theme,
}: {
  title: string;
  subtitle?: string;
  score: number;
  metrics: Array<{ label: string; value: string }>;
  theme: typeof themes.industry;
}) => {
  const safeTitle = escapeXml(title.length > 45 ? title.slice(0, 42) + "..." : title);
  const safeSubtitle = subtitle ? escapeXml(subtitle) : "Performance proof snapshot";

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

  const scoreColor = score >= 90 ? "#34d399" : score >= 70 ? "#fbbf24" : "#fb7185";
  const scoreGlow = score >= 90 ? "rgba(52,211,153,0.3)" : score >= 70 ? "rgba(251,191,36,0.3)" : "rgba(251,113,133,0.3)";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${theme.bgStart}" />
        <stop offset="60%" stop-color="#1e293b" />
        <stop offset="100%" stop-color="${theme.bgEnd}" />
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${theme.primary}" />
        <stop offset="100%" stop-color="${theme.secondary}" />
      </linearGradient>
      <radialGradient id="glow" cx="20%" cy="10%" r="80%">
        <stop offset="0%" stop-color="${theme.primary}" stop-opacity="0.3" />
        <stop offset="100%" stop-color="${theme.primary}" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" />
    <rect width="1200" height="630" fill="url(#glow)" />
    <rect x="40" y="40" width="1120" height="550" rx="36" fill="rgba(15,23,42,0.6)" stroke="url(#accent)" stroke-width="3" />
    <text x="64" y="110" fill="${theme.primary}" font-size="18" font-family="ui-sans-serif, system-ui, -apple-system" letter-spacing="3" font-weight="600">WHY IS MY WEBSITE SLOW</text>
    <text x="64" y="175" fill="#f8fafc" font-size="48" font-family="ui-sans-serif, system-ui, -apple-system" font-weight="700">${safeTitle}</text>
    <text x="64" y="225" fill="#94a3b8" font-size="22" font-family="ui-sans-serif, system-ui, -apple-system">${safeSubtitle}</text>
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
  const kind = params.kind ?? "";
  const slug = params.slug ?? "";

  let title = "Website speed proof";
  let subtitle: string | undefined = "Performance benchmarks and fixes";
  let score = 72;
  let metrics: Array<{ label: string; value: string }> = [
    { label: "LCP", value: "3.1s" },
    { label: "INP", value: "260ms" },
    { label: "CLS", value: "0.16" },
  ];
  let theme = themes.industry;

  try {
    if (kind === "problem") {
      const entry = PROBLEMS.find((item) => item.slug === slug);
      if (!entry) return new Response("Not found", { status: 404 });
      const proof = buildProblemProofDataset(entry);
      title = entry.h1;
      subtitle = `Fix ${entry.issueTitle}`;
      score = proof.caseStudy.afterScore;
      metrics = proof.keyMetrics;
      theme = themes.problem;

    } else if (kind === "platform") {
      const platform = PLATFORMS.find((item) => item.platform === slug);
      if (!platform) return new Response("Not found", { status: 404 });
      const platformIssues = PROBLEMS.filter((item) => item.platform === platform.platform).map((item) => item.issueTitle);
      const proof = buildPlatformProofDataset(platform, platformIssues);
      title = `${platform.platform} speed audit`;
      subtitle = `Common ${platform.platform} issues and fixes`;
      score = proof.caseStudy.afterScore;
      metrics = proof.keyMetrics;
      theme = themes.platform;

    } else if (kind === "industry") {
      const industry = INDUSTRIES.find((item) => item.industry === slug);
      if (!industry) return new Response("Not found", { status: 404 });
      const issueTitles = PROBLEMS.filter((item) => item.industry === industry.industry).map((item) => item.issueTitle);
      const proof = buildIndustryProofDataset(industry, issueTitles);
      title = `${industry.industry} speed audit`;
      subtitle = `Industry benchmarks and risks`;
      score = proof.caseStudy.afterScore;
      metrics = proof.keyMetrics;
      theme = themes.industry;

    } else if (kind === "report") {
      const reportId = slug;
      let report = null;

      try {
        const stored = await loadStoredReport(reportId, {} as any);
        report = stored?.report;
      } catch (e) {
        // Fall through to default
      }

      if (report) {
        const host = report.canonicalHost;
        const grade = report.summary?.grade || "C";
        const score100 = report.summary?.score100 || 65;

        title = `${host} performance report`;
        subtitle = `Grade ${grade} • ${report.device || "mobile"} scan`;
        score = score100;

        metrics = [
          { label: "LCP", value: report.psi?.cwv?.lcp_ms ? `${Math.round(report.psi.cwv.lcp_ms)}ms` : "-" },
          { label: "INP", value: report.psi?.cwv?.inp_ms ? `${Math.round(report.psi.cwv.inp_ms)}ms` : "-" },
          { label: "CLS", value: report.psi?.cwv?.cls ? report.psi.cwv.cls.toFixed(2) : "-" },
        ].filter(m => m.value !== "-");

        theme = getScoreColor(score100);
      } else {
        title = "Performance Report";
        subtitle = "Website speed analysis";
        score = 72;
        theme = themes.report.medium;
      }

    } else {
      return new Response("Not found", { status: 404 });
    }
  } catch (error) {
    console.error("OG image generation error:", error);
  }

  const svgString = renderSvg({ title, subtitle, score, metrics, theme });

  try {
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
    console.error("PNG conversion error:", error);
    return new Response("Error generating image", { status: 500 });
  }
};
