import type { APIRoute } from "astro";
import { sendAlertEmail } from "../../../lib/alerts";
import { env } from "../../../lib/env";
import { isPaidStatus, type Plan } from "../../../lib/plan";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { runEnhancedScan } from "../../../lib/scan.enhanced";
import { recordScanFact, trackEvent } from "../../../lib/analytics";

interface WorkerRequestBody {
  scanId?: string;
  targetKeyword?: string;
  includeSeoAnalysis?: boolean;
  includeImageAudit?: boolean;
}

function toHost(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return rawUrl;
  }
}

function summaryScore(summary: any) {
  const score = summary?.score100;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function cwvStatusFromReport(report: any) {
  const status = report?.psi?.cwv?.status;
  return status === "pass" || status === "fail" || status === "unknown" ? status : null;
}

async function maybeSendRegressionAlert(params: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  scanId: string;
  scan: { user_id?: string | null; project_id?: string | null; url?: string | null };
  report: any;
}) {
  const { admin, scanId, scan, report } = params;
  if (!admin) return;
  const userId = scan.user_id ?? null;
  const projectId = scan.project_id ?? null;
  if (!userId || !projectId) return;

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("plan,status")
    .eq("user_id", userId)
    .maybeSingle();
  const plan = (subscription?.plan as Plan | undefined) ?? "free";
  if (plan === "free" || !isPaidStatus(subscription?.status)) return;

  const { data: previous } = await admin
    .from("scans")
    .select("id,summary_json,report_json")
    .eq("project_id", projectId)
    .eq("status", "done")
    .neq("id", scanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!previous) return;

  const previousScore = summaryScore(previous.summary_json);
  const currentScore = summaryScore(report?.summary);
  const previousCwv = cwvStatusFromReport(previous.report_json);
  const currentCwv = cwvStatusFromReport(report);

  const scoreDropped =
    previousScore !== null &&
    currentScore !== null &&
    previousScore - currentScore >= 8;
  const cwvRegressed = previousCwv === "pass" && currentCwv === "fail";
  if (!scoreDropped && !cwvRegressed) return;

  const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  const email = profile?.email as string | undefined;
  if (!email) return;

  const appBase = env.APP_BASE_URL() ?? "https://www.whyismywebsiteslow.com";
  const reportUrl = `${appBase}/report/${scanId}`;
  const host = toHost(scan.url ?? report?.url ?? "project");
  const scoreLine =
    previousScore !== null && currentScore !== null
      ? `Score ${previousScore} -> ${currentScore}`
      : "Score change unavailable";
  const cwvLine = `CWV ${previousCwv ?? "-"} -> ${currentCwv ?? "-"}`;

  await sendAlertEmail({
    to: email,
    subject: `Regression alert for ${host}`,
    text: `We detected a regression on ${host}.\n${scoreLine}\n${cwvLine}\nReview report: ${reportUrl}`,
    html: `<p>We detected a regression on <strong>${host}</strong>.</p><p>${scoreLine}<br/>${cwvLine}</p><p><a href="${reportUrl}">Open latest report</a></p>`,
  });
}

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

  const body = await request.json().catch((error) => {
    console.error("Error parsing request body in worker:", error);
    return {};
  }) as WorkerRequestBody;
  const scanId = body.scanId;
  if (!scanId) {
    return new Response(JSON.stringify({ error: "scanId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const targetKeyword = body.targetKeyword;
  const includeSeoAnalysis = body.includeSeoAnalysis !== false;
  const includeImageAudit = body.includeImageAudit !== false;

  const { data: scan, error: scanError } = await admin
    .from("scans")
    .select(
      "id,status,url,user_id,project_id,device,visibility,crawl_enabled,crawl_max_links,manage_token_hash,started_at,finished_at"
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

    const { data: subscription } = scan.user_id
      ? await admin
          .from("subscriptions")
          .select("status")
          .eq("user_id", scan.user_id)
          .maybeSingle()
      : { data: null };

    await recordScanFact(
      report,
      {
        projectId: scan.project_id ?? null,
        userId: scan.user_id ?? null,
        unlockStatus: "locked",
        subscriptionStatus: subscription?.status ?? null,
        serviceLeadStatus: "none",
      },
      admin
    );
    await trackEvent(
      {
        eventType: "scan_completed",
        scanId,
        reportId: scanId,
        projectId: scan.project_id ?? null,
        userId: scan.user_id ?? null,
        source: "worker",
        metadata: {
          score100: report.summary.score100,
          cwvStatus: report.psi.cwv.status,
        },
      },
      admin
    );

    try {
      await maybeSendRegressionAlert({ admin, scanId, scan, report });
    } catch (alertError) {
      console.error("Failed to send regression alert:", alertError);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Worker scan error:", error);
    const message = "Scan failed"; // Generic message to avoid exposing details
    await admin.from("scans").update({ status: "failed", error: message, finished_at: new Date().toISOString() }).eq("id", scanId);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
