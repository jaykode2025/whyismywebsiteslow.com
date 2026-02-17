import type { Report, ScanRequest, StoredReport } from "./types";
import { loadReports, persistReports, persistReportsAsync } from "./db";
import { generateId, hashToken } from "./tokens";

const reports = loadReports();
let persistenceTimeout: NodeJS.Timeout | null = null;

function debouncedPersist() {
  if (persistenceTimeout) clearTimeout(persistenceTimeout);
  persistenceTimeout = setTimeout(() => {
    // Using the sync version for now to avoid async issues with setTimeout
    persistReports(reports);
    persistenceTimeout = null;
  }, 100);
}

export async function createReportPlaceholder(input: ScanRequest, writeToken: string) {
  void input;
  const id = generateId();
  const stored: StoredReport = {
    status: "queued",
  };
  reports.set(id, stored);
  await debouncedPersist();

  return { id, writeToken, writeTokenHash: hashToken(writeToken) };
}

export async function setReport(id: string, report: Report) {
  reports.set(id, { status: "done", report });
  await debouncedPersist();
}

export async function setReportStatus(id: string, status: StoredReport["status"], error?: string) {
  const existing = reports.get(id);
  reports.set(id, {
    status,
    report: existing?.report,
    error,
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
