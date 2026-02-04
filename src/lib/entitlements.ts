import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseEnv } from "./env";

type Entitlement = {
  report_id: string;
  unlocked: boolean;
  stripe_session_id: string | null;
  created_at: string;
};

const DATA_DIR = join(process.cwd(), ".data");
const FILE_PATH = join(DATA_DIR, "entitlements.json");

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

function loadLocal(): Map<string, Entitlement> {
  ensureFile();
  try {
    const raw = readFileSync(FILE_PATH, "utf-8");
    const json = JSON.parse(raw) as Record<string, Entitlement>;
    return new Map(Object.entries(json));
  } catch {
    return new Map();
  }
}

function persistLocal(map: Map<string, Entitlement>) {
  ensureFile();
  const obj = Object.fromEntries(map.entries());
  writeFileSync(FILE_PATH, JSON.stringify(obj, null, 2), "utf-8");
}

export async function isReportUnlocked(reportId: string, locals: App.Locals) {
  if (!reportId) return false;
  if (hasSupabaseEnv() && locals.supabase) {
    const { data } = await locals.supabase
      .from("report_entitlements")
      .select("unlocked")
      .eq("report_id", reportId)
      .maybeSingle();
    return Boolean(data?.unlocked);
  }
  const map = loadLocal();
  return map.get(reportId)?.unlocked ?? false;
}

export async function unlockReport(
  reportId: string,
  stripeSessionId: string | null,
  options: { supabase?: SupabaseClient | null } = {}
) {
  if (!reportId) return false;
  const createdAt = new Date().toISOString();
  if (options.supabase) {
    const { error } = await options.supabase.from("report_entitlements").upsert({
      report_id: reportId,
      unlocked: true,
      stripe_session_id: stripeSessionId,
      created_at: createdAt,
    });
    return !error;
  }
  const map = loadLocal();
  map.set(reportId, {
    report_id: reportId,
    unlocked: true,
    stripe_session_id: stripeSessionId,
    created_at: createdAt,
  });
  persistLocal(map);
  return true;
}
