import type { Report, StoredReport } from "./types";
import { getReport, listReports } from "./store";
import { hasSupabaseEnv } from "./env";
import { createSupabaseAdminClient } from "./supabase/admin";

function stripManage(report: Report): Report {
  // Avoid leaking manage token hash into HTML/JSON unintentionally.
  const { manage, ...rest } = report as any;
  return rest as Report;
}

export async function loadStoredReport(id: string, locals: App.Locals): Promise<StoredReport | undefined> {
  const readClient = createSupabaseAdminClient() ?? locals.supabase;
  if (!hasSupabaseEnv() || !readClient) return getReport(id);

  const { data, error } = await readClient
    .from("scans")
    .select("status,error,report_json,url,device,visibility,crawl_enabled,crawl_max_links")
    .eq("id", id)
    .maybeSingle();

  if (error) return getReport(id);
  if (!data) return undefined;
  if (data.status !== "done" || !data.report_json) {
    return {
      status: data.status as StoredReport["status"],
      error: data.error ?? undefined,
      request: {
        url: data.url,
        device: data.device,
        visibility: data.visibility,
        crawl: {
          enabled: Boolean(data.crawl_enabled),
          maxLinks: data.crawl_max_links ?? 1,
        },
      },
    };
  }

  return {
    status: "done",
    report: stripManage(data.report_json as unknown as Report),
    request: {
      url: data.url,
      device: data.device,
      visibility: data.visibility,
      crawl: {
        enabled: Boolean(data.crawl_enabled),
        maxLinks: data.crawl_max_links ?? 1,
      },
    },
  };
}

export async function listPublicReports(locals: App.Locals): Promise<Map<string, StoredReport>> {
  const readClient = createSupabaseAdminClient() ?? locals.supabase;
  if (!hasSupabaseEnv() || !readClient) return listReports();

  const { data, error } = await readClient
    .from("scans")
    .select("id,status,error,report_json,visibility")
    .eq("visibility", "public")
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return listReports();

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
