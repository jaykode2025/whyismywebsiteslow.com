import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { FileLock } from "./fileLock";
import type { StoredReport } from "./types";
import { createSupabaseAdminClient } from "./supabase/admin";
import { logger } from "./logger";

// DEPRECATED: File-based persistence only used as fallback when Supabase is unavailable.
// For production (Vercel), always use Supabase which is configured and reliable.
// .data/ is ephemeral on serverless and NOT shared across instances.

const DATA_DIR = join(process.cwd(), ".data");
const FILE_PATH = join(DATA_DIR, "reports.json");

function ensureFile() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    if (!exists()) {
      writeFileSync(FILE_PATH, JSON.stringify({}), "utf-8");
    }
  } catch {
    // ignore init errors; caller will handle read/write failure paths
  }
}

function exists() {
  try {
    readFileSync(FILE_PATH, "utf-8");
    return true;
  } catch {
    return false;
  }
}

// Fallback only: load reports from file if Supabase is unavailable
export async function loadReports(): Promise<Map<string, StoredReport>> {
  const admin = createSupabaseAdminClient();
  
  // Prefer Supabase: faster, persistent, multi-instance safe
  if (admin) {
    try {
      const { data: scans, error } = await admin
        .from("scans")
        .select("id, status, report_json, error, url, device, visibility, crawl_enabled, crawl_max_links, created_at")
        .order("created_at", { ascending: false })
        .limit(1000); // Prevent unbounded memory growth

      if (!error && scans) {
        const map = new Map<string, StoredReport>();
        for (const scan of scans) {
          map.set(scan.id, {
            status: (scan.status as any) || "queued",
            report: scan.report_json || undefined,
            error: scan.error || undefined,
            request: {
              url: scan.url,
              device: scan.device as any,
              crawl: {
                enabled: scan.crawl_enabled || false,
                maxLinks: scan.crawl_max_links || 1,
              },
              visibility: scan.visibility as any,
            },
          });
        }
        return map;
      }
    } catch (err) {
      logger.error("Failed to load reports from Supabase, falling back to file:", err);
    }
  }

  // Fallback: file-based (local dev only)
  ensureFile();
  try {
    const raw = readFileSync(FILE_PATH, "utf-8");
    const json = JSON.parse(raw) as Record<string, StoredReport>;
    return new Map(Object.entries(json));
  } catch {
    return new Map();
  }
}

const reportLock = new FileLock(FILE_PATH);

// Async persistence to Supabase (preferred)
export async function persistReportsAsync(map: Map<string, StoredReport>) {
  const admin = createSupabaseAdminClient();
  
  if (admin) {
    try {
      // Batch upsert to Supabase (much faster than individual writes)
      const scans = Array.from(map.entries()).map(([id, report]) => ({
        id,
        status: report.status,
        report_json: report.report,
        error: report.error,
      }));
      
      if (scans.length > 0) {
        const { error } = await admin.from("scans").upsert(scans);
        if (!error) {
          logger.debug(`Persisted ${map.size} reports to Supabase`);
          return;
        }
      }
    } catch (error: any) {
      logger.error("Failed to persist reports to Supabase:", error);
    }
  }

  // Fallback: file-based
  try {
    await reportLock.withLock(async () => {
      ensureFile();
      const obj = Object.fromEntries(map.entries());
      writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), "utf-8");
      logger.debug(`Persisted ${map.size} reports to file`);
    });
  } catch (error: any) {
    logger.error("Failed to persist reports:", error);
  }
}

// Sync version for backward compatibility (DO NOT USE in new code)
export function persistReports(map: Map<string, StoredReport>) {
  try {
    ensureFile();
    const obj = Object.fromEntries(map.entries());
    writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), "utf-8");
    logger.debug(`Persisted ${map.size} reports`);
  } catch (error: any) {
    logger.error("Failed to persist reports:", error);
  }
}
