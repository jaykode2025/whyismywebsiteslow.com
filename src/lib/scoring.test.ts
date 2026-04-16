import { describe, expect, it } from "vitest";
import { computeScore } from "./scoring";

describe("computeScore", () => {
  it("returns an A for a healthy scan", () => {
    const result = computeScore({
      source: "live",
      lighthouse: {
        performance: 0.96,
        accessibility: 0.9,
        bestPractices: 0.9,
        seo: 0.9,
      },
      cwv: {
        status: "pass",
        ttfb_ms: 420,
      },
      audits: {
        totalByteWeight: 1_200_000,
      },
    });

    expect(result).toEqual({ score: 96, grade: "A" });
  });

  it("applies all penalties when the scan is slow and heavy", () => {
    const result = computeScore({
      source: "live",
      lighthouse: {
        performance: 0.88,
        accessibility: 0.9,
        bestPractices: 0.9,
        seo: 0.9,
      },
      cwv: {
        status: "fail",
        ttfb_ms: 1200,
      },
      audits: {
        totalByteWeight: 4_500_000,
      },
    });

    expect(result).toEqual({ score: 53, grade: "F" });
  });

  it("never returns a negative score", () => {
    const result = computeScore({
      source: "live",
      lighthouse: {
        performance: 0.05,
        accessibility: 0.9,
        bestPractices: 0.9,
        seo: 0.9,
      },
      cwv: {
        status: "fail",
        ttfb_ms: 4000,
      },
      audits: {
        totalByteWeight: 9_000_000,
      },
    });

    expect(result).toEqual({ score: 0, grade: "F" });
  });
});
