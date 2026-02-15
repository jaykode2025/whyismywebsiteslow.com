import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createSupabaseAdminClient } from "./supabase/admin";

export type Lead = {
  email: string;
  reportId?: string | null;
  source: "preview";
  createdAt: string;
  userAgent?: string | null;
  referer?: string | null;
  reportUrl?: string | null;
};

const DATA_DIR = join(process.cwd(), ".data");
const FILE_PATH = join(DATA_DIR, "leads.json");

function ensureFile() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    readFileSync(FILE_PATH, "utf-8");
  } catch {
    try {
      writeFileSync(FILE_PATH, JSON.stringify([]), "utf-8");
    } catch {
      // ignore init errors
    }
  }
}

function loadLeads(): Lead[] {
  ensureFile();
  try {
    const raw = readFileSync(FILE_PATH, "utf-8");
    const json = JSON.parse(raw) as Lead[];
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

function persistLeads(leads: Lead[]) {
  ensureFile();
  writeFileSync(FILE_PATH, JSON.stringify(leads, null, 2), "utf-8");
}

export async function saveLead(lead: Lead) {
  const admin = createSupabaseAdminClient();
  if (admin) {
    const { error } = await admin.from("leads").insert({
      email: lead.email,
      report_id: lead.reportId ?? null,
      source: lead.source,
      created_at: lead.createdAt,
      user_agent: lead.userAgent ?? null,
      referer: lead.referer ?? null,
      report_url: lead.reportUrl ?? null,
    });
    if (!error) return { ok: true, stored: "supabase" as const };
    console.error("Failed to persist lead in Supabase:", error.message);
  }

  try {
    const existing = loadLeads();
    existing.push(lead);
    persistLeads(existing);
    return { ok: true, stored: "file" as const };
  } catch {
    return { ok: false, stored: "none" as const };
  }
}
