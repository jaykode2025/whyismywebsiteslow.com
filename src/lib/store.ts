import type { Report, ScanRequest, StoredReport, StoredScanRequest } from "./types";
import { persistReportsAsync } from "./db";
import { generateId, hashToken } from "./tokens";
import { createSupabaseAdminClient } from "./supabase/admin";
import { logger } from "./logger";

// In-memory cache (per-instance for local fallback)
// For production, reports should be in Supabase and cached via Redis
const reports = new Map<string, StoredReport>();
let persistenceTimeout: NodeJS.Timeout | null = null;
const PERSIST_DEBOUNCE_MS = 500; // Increased from 100ms to batch more writes

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
    void persistReportsAsync(reports);
    persistenceTimeout = null;
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Create a scan placeholder in Supabase immediately so "scan started" is never lost.
 * File store is fallback only.
 */
export async function createReportPlaceholder(
  input: ScanRequest,
  writeToken: string
) {
  const id = generateId();
  const writeTokenHash = hashToken(writeToken);
  
  // Try Supabase first (production)
  const admin = createSupabaseAdminClient();
  if (admin) {
    try {
      const { error } = await admin.from("scans").insert({
        id,
        user_id: null,
        project_id: null,
        url: input.url,
        status: "queued",
        device: input.device,
        visibility: input.visibility ?? "unlisted",
        crawl_enabled: input.crawl?.enabled ?? false,
        crawl_max_links: input.crawl?.maxLinks ?? 1,
        manage_token_hash: writeTokenHash,
      });
      
      if (!error) {
        return { id, writeToken, writeTokenHash };
      }
      logger.error("Failed to create report placeholder in Supabase:", error);
    } catch (err) {
      logger.error("Exception creating report placeholder in Supabase:", err);
    }
  }
  
  // Fallback: in-memory cache
  const stored: StoredReport = {
    status: "queued",
    request: toStoredRequest(input),
  };
  reports.set(id, stored);
  debouncedPersist();
  
  return { id, writeToken, writeTokenHash };
}

export async function setReport(id: string, report: Report) {
  const existing = reports.get(id);
  const updated: StoredReport = {
    status: "done",
    report,
    request: existing?.request,
  };
  reports.set(id, updated);
  
  // Also update Supabase if available
  const admin = createSupabaseAdminClient();
  if (admin) {
    void admin
      .from("scans")
      .update({ status: "done", report_json: report })
      .eq("id", id)
      .catch((err) => logger.error(`Failed to update report ${id}:`, err));
  }
  
  debouncedPersist();
}

export async function setReportStatus(
  id: string,
  status: StoredReport["status"],
  error?: string
) {
  const existing = reports.get(id);
  reports.set(id, {
    status,
    report: existing?.report,
    error,
    request: existing?.request,
  });
  
  // Also update Supabase if available
  const admin = createSupabaseAdminClient();
  if (admin) {
    void admin
      .from("scans")
      .update({ status, error: error || null })
      .eq("id", id)
      .catch((err) => logger.error(`Failed to update status for ${id}:`, err));
  }
  
  debouncedPersist();
}

export function getReport(id: string) {
  return reports.get(id);
}

export function deleteReport(id: string) {
  const result = reports.delete(id);
  
  // Also delete from Supabase if available
  const admin = createSupabaseAdminClient();
  if (admin) {
    void admin
      .from("scans")
      .delete()
      .eq("id", id)
      .catch((err) => logger.error(`Failed to delete report ${id}:`, err));
  }
  
  debouncedPersist();
  return result;
}

export function listReports() {
  return reports;
}
