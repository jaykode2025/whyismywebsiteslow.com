import type { Report, StoredReport } from "./types";
import { getReport, listReports } from "./store";
import { hasSupabaseEnv } from "./env";

function stripManage(report: Report): Report {
  // Avoid leaking manage token hash into HTML/JSON unintentionally.
  const { manage, ...rest } = report as any;
  return rest as Report;
}

export async function loadStoredReport(id: string, locals: App.Locals): Promise<StoredReport | undefined> {
  if (!hasSupabaseEnv() || !locals.supabase) return getReport(id);

  const { data, error } = await locals.supabase
    .from("scans")
    .select("status,error,report_json")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return undefined;
  if (data.status !== "done" || !data.report_json) {
    return { status: data.status as StoredReport["status"], error: data.error ?? undefined };
  }

  return { status: "done", report: stripManage(data.report_json as unknown as Report) };
}

export async function listPublicReports(locals: App.Locals): Promise<Map<string, StoredReport>> {
  if (!hasSupabaseEnv() || !locals.supabase) return listReports();

  const { data } = await locals.supabase
    .from("scans")
    .select("id,status,error,report_json,visibility")
    .eq("visibility", "public")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1000);

  const map = new Map<string, StoredReport>();
  for (const row of data ?? []) {
    if (row.status === "done" && row.report_json) {
      map.set(row.id, { status: "done", report: stripManage(row.report_json as unknown as Report) });
    } else {
      map.set(row.id, { status: row.status as StoredReport["status"], error: row.error ?? undefined });
    }
  }
  return map;
}

