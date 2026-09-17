import type { Report } from "./types";

/**
 * The PageSpeed/lab metrics block carried on a report.
 *
 * This is the canonical shape produced by the enhanced scanner
 * (`scanner/enhanced.ts` -> `lab`, then augmented with CrUX real-user data,
 * network timings and the blended score) and consumed by scoring, insights
 * and K-score. It is defined off `Report` so the report contract stays the
 * single source of truth and the two can never drift apart.
 */
export type PsiResult = Report["psi"];
