import { createHash, randomBytes } from "node:crypto";
import type { Report, ScanRequest, StoredReport } from "./types";

const reports = new Map<string, StoredReport>();

export function generateId(length = 6) {
  return randomBytes(8).toString("base64url").slice(0, length);
}

export function generateToken() {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createReportPlaceholder(input: ScanRequest, writeToken: string) {
  const id = generateId();
  const stored: StoredReport = {
    status: "queued",
  };
  reports.set(id, stored);

  return { id, writeToken, writeTokenHash: hashToken(writeToken) };
}

export function setReport(id: string, report: Report) {
  reports.set(id, { status: "done", report });
}

export function setReportStatus(id: string, status: StoredReport["status"], error?: string) {
  const existing = reports.get(id);
  reports.set(id, {
    status,
    report: existing?.report,
    error,
  });
}

export function getReport(id: string) {
  return reports.get(id);
}

export function deleteReport(id: string) {
  return reports.delete(id);
}

export function listReports() {
  return reports;
}
