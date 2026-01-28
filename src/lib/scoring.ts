import type { Report } from "./types";

export function computeScore(psi: Report["psi"]) {
  const base = Math.round((psi.lighthouse.performance ?? 0) * 100);
  let score = base;
  if (psi.cwv.status === "fail") score -= 15;
  if (psi.cwv.ttfb_ms && psi.cwv.ttfb_ms > 800) score -= 10;
  if (psi.audits.totalByteWeight && psi.audits.totalByteWeight > 3_000_000) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  return { score, grade } as const;
}
