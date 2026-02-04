import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { runEnhancedScan } from "../../../lib/scan.enhanced";

export const POST: APIRoute = async ({ request }) => {
  const expected = env.QSTASH_TOKEN();
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const scanId = String((body as any).scanId ?? "");
  const targetKeyword = typeof (body as any).targetKeyword === "string" ? String((body as any).targetKeyword) : undefined;
  const includeSeoAnalysis = (body as any).includeSeoAnalysis !== false;
  const includeImageAudit = (body as any).includeImageAudit !== false;
  if (!scanId) {
    return new Response(JSON.stringify({ error: "scanId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: scan, error: scanError } = await admin
    .from("scans")
    .select(
      "id,status,url,device,visibility,crawl_enabled,crawl_max_links,manage_token_hash,started_at,finished_at"
    )
    .eq("id", scanId)
    .maybeSingle();

  if (scanError || !scan) {
    return new Response(JSON.stringify({ error: "Scan not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (scan.status === "done") {
    return new Response(JSON.stringify({ ok: true, status: "done" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (scan.status === "running") {
    return new Response(JSON.stringify({ ok: true, status: "running" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const startedAt = new Date().toISOString();
  await admin.from("scans").update({ status: "running", started_at: startedAt, error: null }).eq("id", scanId);

  try {
    const report = await runEnhancedScan(
      scanId,
      {
        url: scan.url,
        device: scan.device,
        visibility: scan.visibility,
        crawl: { enabled: Boolean(scan.crawl_enabled), maxLinks: Number(scan.crawl_max_links ?? 1) },
      } as any,
      scan.manage_token_hash ?? "",
      { includeSeoAnalysis, includeImageAudit, targetKeyword }
    );

    const finishedAt = new Date().toISOString();
    await admin
      .from("scans")
      .update({
        status: "done",
        report_json: report,
        summary_json: report.summary,
        error: null,
        finished_at: finishedAt,
      })
      .eq("id", scanId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const message = error?.message ?? "Scan failed";
    await admin.from("scans").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", scanId);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
