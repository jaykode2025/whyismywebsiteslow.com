import { join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createSupabaseAdminClient } from "./supabase/admin";
import { logger } from "./logger";

export type ServiceLead = {
  email: string;
  websiteUrl?: string | null;
  reportId?: string | null;
  notes?: string | null;
  source: string;
  offerContext?: string | null;
  ctaVariant?: string | null;
  createdAt: string;
  userAgent?: string | null;
  referer?: string | null;
};

// File fallback only (local dev); production uses Supabase
const DATA_DIR = join(process.cwd(), ".data");
const FILE_PATH = join(DATA_DIR, "service-leads.json");

function ensureFile() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    readFileSync(FILE_PATH, "utf-8");
  } catch {
    try {
      writeFileSync(FILE_PATH, JSON.stringify([]), "utf-8");
    } catch {
      // Ignore fallback initialization errors.
    }
  }
}

function loadLeads(): ServiceLead[] {
  ensureFile();
  try {
    const raw = readFileSync(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ServiceLead[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLeads(leads: ServiceLead[]) {
  ensureFile();
  writeFileSync(FILE_PATH, JSON.stringify(leads, null, 2), "utf-8");
}

export async function saveServiceLead(lead: ServiceLead) {
  const admin = createSupabaseAdminClient();
  if (admin) {
    try {
      const { error } = await admin.from("service_leads").insert({
        email: lead.email,
        website_url: lead.websiteUrl ?? null,
        report_id: lead.reportId ?? null,
        notes: lead.notes ?? null,
        source: lead.source,
        offer_context: lead.offerContext ?? null,
        cta_variant: lead.ctaVariant ?? null,
        created_at: lead.createdAt,
        user_agent: lead.userAgent ?? null,
        referer: lead.referer ?? null,
      });
      if (!error) {
        return { ok: true, stored: "supabase" as const };
      }
      logger.error("Failed to persist service lead in Supabase:", error.message);
    } catch (err) {
      logger.error("Exception persisting service lead to Supabase:", err);
    }
  }

  // Fallback: file storage
  try {
    const existing = loadLeads();
    existing.push(lead);
    persistLeads(existing);
    return { ok: true, stored: "file" as const };
  } catch (err) {
    logger.error("Failed to persist service lead to file:", err);
    return { ok: false, stored: "none" as const };
  }
}
