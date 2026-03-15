export const LEAD_ACCESS_COOKIE_NAME = "report_preview_access";

const MAX_COOKIE_REPORT_IDS = 40;

function normalizeReportId(value: string) {
  return value.trim().replace(/,/g, "");
}

export function parseLeadAccessCookie(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((id) => normalizeReportId(id))
    .filter(Boolean);
}

export function hasLeadAccess(raw: string | undefined | null, reportId: string): boolean {
  const normalized = normalizeReportId(reportId);
  if (!normalized) return false;
  return parseLeadAccessCookie(raw).includes(normalized);
}

export function appendLeadAccess(raw: string | undefined | null, reportId: string): string {
  const normalized = normalizeReportId(reportId);
  if (!normalized) return parseLeadAccessCookie(raw).slice(0, MAX_COOKIE_REPORT_IDS).join(",");

  const deduped = parseLeadAccessCookie(raw).filter((id) => id !== normalized);
  deduped.push(normalized);
  return deduped.slice(-MAX_COOKIE_REPORT_IDS).join(",");
}
