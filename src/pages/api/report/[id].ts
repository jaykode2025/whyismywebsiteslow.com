import type { APIRoute } from "astro";
import { getReport } from "../../../lib/store";
import { hasSupabaseEnv } from "../../../lib/env";
import type { Report } from "../../../lib/types";

export const GET: APIRoute = async (context) => {
  const id = context.params.id ?? "";
  // Prefer Supabase when configured
  if (hasSupabaseEnv() && context.locals.supabase) {
    const { data, error } = await context.locals.supabase
      .from("scans")
      .select("status,error,report_json")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) {
      return new Response(JSON.stringify({ status: "failed", error: "Report not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (data.status !== "done" || !data.report_json) {
      return new Response(JSON.stringify({ status: data.status, error: data.error }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const report = data.report_json as unknown as Report;
    const { manage, ...publicReport } = report;
    return new Response(JSON.stringify({ status: "done", report: publicReport }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stored = getReport(id);

  if (!stored) {
    return new Response(JSON.stringify({ status: "failed", error: "Report not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (stored.status !== "done" || !stored.report) {
    return new Response(JSON.stringify({ status: stored.status, error: stored.error }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { manage, ...publicReport } = stored.report;

  return new Response(JSON.stringify({ status: "done", report: publicReport }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
