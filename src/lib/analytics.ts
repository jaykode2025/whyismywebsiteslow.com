import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { Report } from "./types";
import { createSupabaseAdminClient } from "./supabase/admin";

type EventRecord = {
  eventType: string;
  scanId?: string | null;
  reportId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  email?: string | null;
  source?: string | null;
  ctaVariant?: string | null;
  offerContext?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type ScanFactRecord = {
  scanId: string;
  projectId?: string | null;
  userId?: string | null;
  createdAt: string;
  canonicalHost: string;
  url: string;
  device: string;
  visibility: string;
  score100: number;
  grade: string;
  cwvStatus: string;
  lcpMs?: number | null;
  inpMs?: number | null;
  cls?: number | null;
  fcpMs?: number | null;
  ttfbMs?: number | null;
  totalByteWeight?: number | null;
  htmlKb?: number | null;
  jsKb?: number | null;
  cssKb?: number | null;
  imageKb?: number | null;
  requestCount?: number | null;
  primaryIssue?: string | null;
  secondaryIssues: string[];
  topIssueCategories: string[];
  frameworkGuess?: string | null;
  cmsGuess?: string | null;
  hostingGuess?: string | null;
  cdnDetected: boolean;
  leadSource?: string | null;
  unlockStatus: string;
  subscriptionStatus?: string | null;
  serviceLeadStatus: string;
};

type ScanFactStatusUpdate = {
  unlockStatus?: string;
  leadSource?: string | null;
  subscriptionStatus?: string | null;
  serviceLeadStatus?: string;
};

const DATA_DIR = join(process.cwd(), ".data");
const EVENTS_FILE = join(DATA_DIR, "events.json");
const FACTS_FILE = join(DATA_DIR, "scan-facts.json");

function ensureFile(path: string, initial: unknown) {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    readFileSync(path, "utf-8");
  } catch {
    try {
      writeFileSync(path, JSON.stringify(initial, null, 2), "utf-8");
    } catch {
      // Ignore local persistence initialization failures.
    }
  }
}

function loadJsonArray<T>(path: string): T[] {
  ensureFile(path, []);
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistJsonArray<T>(path: string, data: T[]) {
  try {
    ensureFile(path, []);
    writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Ignore local persistence failures (read-only FS in production/serverless).
  }
}

function persistEventLocally(event: EventRecord) {
  try {
    const existing = loadJsonArray<EventRecord>(EVENTS_FILE);
    existing.push(event);
    persistJsonArray(EVENTS_FILE, existing);
  } catch {
    // Ignore local persistence failures.
  }
}

function persistFactLocally(record: ScanFactRecord) {
  try {
    const existing = loadJsonArray<ScanFactRecord>(FACTS_FILE);
    const next = existing.filter((item) => item.scanId !== record.scanId);
    next.push(record);
    persistJsonArray(FACTS_FILE, next);
  } catch {
    // Ignore local persistence failures.
  }
}

function updateFactLocally(scanId: string, updates: ScanFactStatusUpdate) {
  try {
    const existing = loadJsonArray<ScanFactRecord>(FACTS_FILE);
    const next = existing.map((item) => (item.scanId === scanId ? { ...item, ...updates } : item));
    persistJsonArray(FACTS_FILE, next);
  } catch {
    // Ignore local persistence failures.
  }
}

function getAdminClient(admin?: ReturnType<typeof createSupabaseAdminClient> | null) {
  return admin ?? createSupabaseAdminClient();
}

export async function trackEvent(
  event: Omit<EventRecord, "createdAt"> & { createdAt?: string },
  admin?: ReturnType<typeof createSupabaseAdminClient> | null
) {
  const record: EventRecord = {
    ...event,
    createdAt: event.createdAt ?? new Date().toISOString(),
  };

  const client = getAdminClient(admin);
  if (client) {
    const { error } = await client.from("events").insert({
      event_type: record.eventType,
      scan_id: record.scanId ?? null,
      report_id: record.reportId ?? null,
      project_id: record.projectId ?? null,
      user_id: record.userId ?? null,
      email: record.email ?? null,
      source: record.source ?? null,
      cta_variant: record.ctaVariant ?? null,
      offer_context: record.offerContext ?? null,
      referrer: record.referrer ?? null,
      user_agent: record.userAgent ?? null,
      path: record.path ?? null,
      metadata: record.metadata ?? {},
      created_at: record.createdAt,
    });
    if (!error) return;
    console.error("Failed to persist event in Supabase:", error.message);
  }

  persistEventLocally(record);
}

export function buildScanFactRecord(
  report: Report,
  options: {
    projectId?: string | null;
    userId?: string | null;
    leadSource?: string | null;
    unlockStatus?: string;
    subscriptionStatus?: string | null;
    serviceLeadStatus?: string;
  } = {}
): ScanFactRecord {
  return {
    scanId: report.id,
    projectId: options.projectId ?? null,
    userId: options.userId ?? null,
    createdAt: report.createdAt,
    canonicalHost: report.canonicalHost,
    url: report.url,
    device: report.device,
    visibility: report.visibility,
    score100: report.summary.score100,
    grade: report.summary.grade,
    cwvStatus: report.psi.cwv.status,
    lcpMs: report.psi.cwv.lcp_ms ?? null,
    inpMs: report.psi.cwv.inp_ms ?? null,
    cls: report.psi.cwv.cls ?? null,
    fcpMs: report.psi.cwv.fcp_ms ?? null,
    ttfbMs: report.psi.cwv.ttfb_ms ?? null,
    totalByteWeight: report.psi.audits.totalByteWeight ?? null,
    htmlKb: report.checks.page.htmlKb ?? null,
    jsKb: report.checks.page.jsKb ?? null,
    cssKb: report.checks.page.cssKb ?? null,
    imageKb: report.checks.page.imageKb ?? null,
    requestCount: report.checks.page.requestCount ?? null,
    primaryIssue: report.summary.topIssues[0] ?? null,
    secondaryIssues: report.summary.topIssues.slice(1),
    topIssueCategories: [...new Set(report.insights.slice(0, 5).map((item) => item.category))],
    frameworkGuess: report.detectedStack.frameworkGuess,
    cmsGuess: report.detectedStack.cmsGuess,
    hostingGuess: report.detectedStack.hostingGuess,
    cdnDetected: report.checks.headers.cdn === "detected",
    leadSource: options.leadSource ?? null,
    unlockStatus: options.unlockStatus ?? "locked",
    subscriptionStatus: options.subscriptionStatus ?? null,
    serviceLeadStatus: options.serviceLeadStatus ?? "none",
  };
}

export async function recordScanFact(
  report: Report,
  options: {
    projectId?: string | null;
    userId?: string | null;
    leadSource?: string | null;
    unlockStatus?: string;
    subscriptionStatus?: string | null;
    serviceLeadStatus?: string;
  } = {},
  admin?: ReturnType<typeof createSupabaseAdminClient> | null
) {
  const record = buildScanFactRecord(report, options);
  const client = getAdminClient(admin);
  if (client) {
    const { error } = await client.from("scan_facts").upsert({
      scan_id: record.scanId,
      project_id: record.projectId ?? null,
      user_id: record.userId ?? null,
      created_at: record.createdAt,
      canonical_host: record.canonicalHost,
      url: record.url,
      device: record.device,
      visibility: record.visibility,
      score100: record.score100,
      grade: record.grade,
      cwv_status: record.cwvStatus,
      lcp_ms: record.lcpMs,
      inp_ms: record.inpMs,
      cls: record.cls,
      fcp_ms: record.fcpMs,
      ttfb_ms: record.ttfbMs,
      total_byte_weight: record.totalByteWeight,
      html_kb: record.htmlKb,
      js_kb: record.jsKb,
      css_kb: record.cssKb,
      image_kb: record.imageKb,
      request_count: record.requestCount,
      primary_issue: record.primaryIssue,
      secondary_issues: record.secondaryIssues,
      top_issue_categories: record.topIssueCategories,
      framework_guess: record.frameworkGuess,
      cms_guess: record.cmsGuess,
      hosting_guess: record.hostingGuess,
      cdn_detected: record.cdnDetected,
      lead_source: record.leadSource,
      unlock_status: record.unlockStatus,
      subscription_status: record.subscriptionStatus,
      service_lead_status: record.serviceLeadStatus,
    });
    if (!error) return;
    console.error("Failed to persist scan facts in Supabase:", error.message);
  }

  persistFactLocally(record);
}

export async function updateScanFactStatus(
  scanId: string,
  updates: ScanFactStatusUpdate,
  admin?: ReturnType<typeof createSupabaseAdminClient> | null
) {
  const client = getAdminClient(admin);
  if (client) {
    const { error } = await client
      .from("scan_facts")
      .update({
        unlock_status: updates.unlockStatus,
        lead_source: updates.leadSource,
        subscription_status: updates.subscriptionStatus,
        service_lead_status: updates.serviceLeadStatus,
      })
      .eq("scan_id", scanId);
    if (!error) return;
    console.error("Failed to update scan fact status in Supabase:", error.message);
  }

  updateFactLocally(scanId, updates);
}
