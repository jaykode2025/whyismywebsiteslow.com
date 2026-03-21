import type { ProjectHealthSummary, RegressionSummary } from "./types";

type ScanLike = {
  id: string;
  project_id?: string | null;
  url?: string | null;
  created_at: string;
  summary_json?: any;
  report_json?: any;
};

function scoreFromScan(scan: ScanLike) {
  const score = scan.summary_json?.score100;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function cwvFromScan(scan: ScanLike) {
  const status = scan.report_json?.psi?.cwv?.status;
  return status === "pass" || status === "fail" || status === "unknown" ? status : null;
}

export function buildProjectHealthSummary(projectId: string, scans: ScanLike[]): ProjectHealthSummary {
  const latest = scans[0];
  const previous = scans[1];
  const latestScore = latest ? scoreFromScan(latest) : null;
  const previousScore = previous ? scoreFromScan(previous) : null;
  const scoreDelta =
    latestScore !== null && previousScore !== null ? latestScore - previousScore : null;

  const latestCwvStatus = latest ? cwvFromScan(latest) : null;
  const previousCwvStatus = previous ? cwvFromScan(previous) : null;

  let trend: ProjectHealthSummary["trend"] = "unknown";
  if (scoreDelta !== null) {
    trend = scoreDelta >= 5 ? "improving" : scoreDelta <= -5 ? "regressed" : "stable";
  } else if (latest) {
    trend = "stable";
  }

  return {
    projectId,
    latestScore,
    previousScore,
    scoreDelta,
    latestCwvStatus,
    previousCwvStatus,
    trend,
    lastScannedAt: latest?.created_at ?? null,
  };
}

export function buildRegressionSummary(projectId: string, projectUrl: string, scans: ScanLike[]): RegressionSummary | null {
  const latest = scans[0];
  const previous = scans[1];
  if (!latest || !previous) return null;

  const currentScore = scoreFromScan(latest);
  const previousScore = scoreFromScan(previous);
  const currentCwvStatus = cwvFromScan(latest);
  const previousCwvStatus = cwvFromScan(previous);

  const scoreDropped =
    previousScore !== null &&
    currentScore !== null &&
    previousScore - currentScore >= 8;
  const cwvRegressed = previousCwvStatus === "pass" && currentCwvStatus === "fail";
  if (!scoreDropped && !cwvRegressed) return null;

  const summary = scoreDropped
    ? `Score dropped from ${previousScore} to ${currentScore} since the previous scan.`
    : `Core Web Vitals regressed from ${previousCwvStatus} to ${currentCwvStatus}.`;

  return {
    projectId,
    projectUrl,
    previousScore,
    currentScore,
    previousCwvStatus,
    currentCwvStatus,
    summary,
  };
}
