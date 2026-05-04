import type { APIRoute } from "astro";
import sharp from "sharp";
import { PROBLEMS } from "../../../data/pseo";
import { buildProblemProofDataset } from "../../../lib/proof";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const renderSvg = (title: string, score: number, metrics: Array<{ label: string; value: string }>) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0b1120" />
        <stop offset="60%" stop-color="#172554" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" />
    <rect x="44" y="44" width="1112" height="542" rx="30" fill="rgba(15,23,42,0.6)" stroke="rgba(148,163,184,0.25)" />
    <text x="72" y="120" fill="#93c5fd" font-size="20" font-family="ui-sans-serif, system-ui" letter-spacing="4">WHY IS MY WEBSITE SLOW</text>
    <text x="72" y="186" fill="#f8fafc" font-size="50" font-family="ui-sans-serif, system-ui" font-weight="700">${escapeXml(title)}</text>
    <text x="72" y="246" fill="#cbd5e1" font-size="26" font-family="ui-sans-serif, system-ui">Performance proof snapshot</text>
    ${metrics
      .slice(0, 3)
      .map(
        (metric, index) => `
      <text x="72" y="${332 + index * 64}" fill="#94a3b8" font-size="18" font-family="ui-sans-serif, system-ui">${escapeXml(metric.label)}</text>
      <text x="72" y="${360 + index * 64}" fill="#e2e8f0" font-size="30" font-family="ui-sans-serif, system-ui" font-weight="700">${escapeXml(metric.value)}</text>
    `
      )
      .join("")}
    <circle cx="980" cy="300" r="130" fill="rgba(56,189,248,0.18)" stroke="rgba(56,189,248,0.45)" />
    <text x="980" y="286" text-anchor="middle" fill="#e2e8f0" font-size="24" font-family="ui-sans-serif, system-ui">Score</text>
    <text x="980" y="342" text-anchor="middle" fill="#22d3ee" font-size="76" font-family="ui-sans-serif, system-ui" font-weight="700">${score}</text>
  </svg>
`;

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug ?? "";
  const entry = PROBLEMS.find((item) => item.slug === slug);
  if (!entry) return new Response("Not found", { status: 404 });

  const proof = buildProblemProofDataset(entry);
  const svgString = renderSvg(entry.h1, proof.caseStudy.afterScore, proof.keyMetrics);

  try {
    const pngBuffer = await sharp(Buffer.from(svgString.trim()))
      .png()
      .toBuffer();

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("PNG conversion error:", error);
    return new Response("Error generating image", { status: 500 });
  }
};
