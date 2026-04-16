import type { Report, ScanRequest, StoredReport, StoredScanRequest } from "./types";
import { loadReports, persistReports } from "./db";
import { generateId, hashToken } from "./tokens";

const reports = loadReports();
let persistenceTimeout: NodeJS.Timeout | null = null;

function toStoredRequest(input: ScanRequest): StoredScanRequest {
  return {
    url: input.url,
    device: input.device,
    crawl: {
      enabled: Boolean(input.crawl?.enabled),
      maxLinks: input.crawl?.maxLinks ?? 1,
    },
    visibility: input.visibility === "public" ? "public" : "unlisted",
  };
}

function debouncedPersist() {
  if (persistenceTimeout) clearTimeout(persistenceTimeout);
  persistenceTimeout = setTimeout(() => {
    persistReports(reports);
    persistenceTimeout = null;
  }, 100);
}

/** Create a scan placeholder and persist immediately so "scan started" is never lost. */
export async function createReportPlaceholder(input: ScanRequest, writeToken: string) {
  void input;
  const id = generateId();
  const stored: StoredReport = {
    status: "queued",
    request: toStoredRequest(input),
  };
  reports.set(id, stored);
  persistReports(reports);
  return { id, writeToken, writeTokenHash: hashToken(writeToken) };
}

export async function setReport(id: string, report: Report) {
  const existing = reports.get(id);
  reports.set(id, { status: "done", report, request: existing?.request });
  await debouncedPersist();
}

export async function setReportStatus(id: string, status: StoredReport["status"], error?: string) {
  const existing = reports.get(id);
  reports.set(id, {
    status,
    report: existing?.report,
    error,
    request: existing?.request,
  });
  await debouncedPersist();
}

export function getReport(id: string) {
  return reports.get(id);
}

export function deleteReport(id: string) {
  const result = reports.delete(id);
  debouncedPersist();
  return result;
}

export function listReports() {
  return reports;
}
