import type { Report } from "./types";

export interface ScoringInput {
  psi: Report["psi"];
  hasCruxData: boolean;
}

export function computeEnhancedScore(input: ScoringInput): { score: number; grade: string; confidence: number } {
  const labScore = Math.round((input.psi.lighthouse.performance ?? 0) * 100);
  
  // If we have CrUX data, blend it with lab metrics (60% RUM + 40% Lab)
  if (input.hasCruxData && input.psi.rum) {
    const cruxScore = computeCruxScore(input.psi.rum);
    const blendedScore = Math.round((cruxScore * 0.6) + (labScore * 0.4));
    
    // Apply business penalties
    let finalScore = blendedScore;
    if (input.psi.cwv.status === "fail") finalScore -= 15;
    if (input.psi.audits.totalByteWeight && input.psi.audits.totalByteWeight > 3_000_000) finalScore -= 10;
    
    finalScore = Math.max(0, Math.min(100, finalScore));
    
    return {
      score: finalScore,
      grade: getGrade(finalScore),
      confidence: input.psi.rum.confidence === "high" ? 0.95 : 0.85
    };
  }
  
  // Fallback to lab-only scoring
  let score = labScore;
  if (input.psi.cwv.status === "fail") score -= 15;
  if (input.psi.audits.totalByteWeight && input.psi.audits.totalByteWeight > 3_000_000) score -= 10;
  score = Math.max(0, Math.min(100, score));
  
  return {
    score,
    grade: getGrade(score),
    confidence: 0.75
  };
}

/**
 * Compute score from CrUX real-user metrics
 * Weights based on business impact:
 * - LCP (40%): Users perceive slow loading
 * - TTFB (30%): Server response affects everything
 * - CLS (20%): Layout shifts frustrate users
 * - INP (10%): Interaction responsiveness
 */
function computeCruxScore(crux: NonNullable<Report["psi"]["rum"]>): number {
  const lcpScore = crux.lcp_ms <= 2500 ? 100 : crux.lcp_ms <= 4000 ? 75 : 50;
  const ttfbScore = crux.ttfb_ms <= 600 ? 100 : crux.ttfb_ms <= 1200 ? 75 : 50;
  const clsScore = crux.cls <= 0.1 ? 100 : crux.cls <= 0.25 ? 75 : 50;
  const inpScore = crux.inp_ms <= 200 ? 100 : crux.inp_ms <= 500 ? 75 : 50;
  
  // Weight by business impact
  return (lcpScore * 0.4) + (ttfbScore * 0.3) + (clsScore * 0.2) + (inpScore * 0.1);
}

function getGrade(score: number): string {
  return score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use computeEnhancedScore instead
 */
export function computeScore(psi: Report["psi"]) {
  const result = computeEnhancedScore({ psi, hasCruxData: !!psi.rum });
  return { score: result.score, grade: result.grade } as const;
}
