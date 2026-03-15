import type { APIRoute } from "astro";
import { sendAlertEmail } from "../../../lib/alerts";
import { env } from "../../../lib/env";
import { getPlanLimits, isPaidStatus, type Plan } from "../../../lib/plan";
import { enqueueQStashJob } from "../../../lib/qstash";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { generateId } from "../../../lib/tokens";

type SubscriptionRow = {
  user_id: string;
  plan: Plan;
  status: string;
};

type ProjectRow = {
  id: string;
  url: string;
  name: string | null;
};

type ScanRow = {
  id: string;
  project_id: string | null;
  url: string;
  device: "mobile" | "desktop";
  visibility: "public" | "unlisted";
  crawl_enabled: boolean | null;
  crawl_max_links: number | null;
  created_at: string;
  summary_json: any;
  report_json: any;
};

type Regression = {
  projectUrl: string;
  previousScore: number | null;
  currentScore: number | null;
  previousCwv: string | null;
  currentCwv: string | null;
};

function scoreFromScan(scan: Pick<ScanRow, "summary_json">) {
  const score = scan.summary_json?.score100;
  return typeof score === "number" && Number.isFinite(score) ? score : null;
}

function cwvFromScan(scan: Pick<ScanRow, "report_json">) {
  const status = scan.report_json?.psi?.cwv?.status;
  return status === "pass" || status === "fail" || status === "unknown" ? status : null;
}

function isRegression(previous: ScanRow, current: ScanRow) {
  const previousScore = scoreFromScan(previous);
  const currentScore = scoreFromScan(current);
  const previousCwv = cwvFromScan(previous);
  const currentCwv = cwvFromScan(current);

  const scoreDropped =
    previousScore !== null &&
    currentScore !== null &&
    previousScore - currentScore >= 8;

  const cwvRegressed = previousCwv === "pass" && currentCwv === "fail";

  return {
    regressed: scoreDropped || cwvRegressed,
    summary: {
      previousScore,
      currentScore,
      previousCwv,
      currentCwv,
    },
  };
}

function hostFromUrl(rawUrl: string) {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return rawUrl;
  }
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

  const baseUrl = env.APP_BASE_URL() ?? new URL(request.url).origin;
  const workerUrl = `${baseUrl}/api/worker/scan`;
  const now = Date.now();
  const rescanThresholdMs = 6.5 * 24 * 60 * 60 * 1000;

  const { data: rawSubs, error: subError } = await admin
    .from("subscriptions")
    .select("user_id,plan,status")
    .in("plan", ["pro", "agency"]);

  if (subError) {
    return new Response(JSON.stringify({ error: subError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subscriptions = (rawSubs ?? []).filter(
    (row): row is SubscriptionRow => Boolean(row.user_id && row.plan && isPaidStatus(row.status))
  );

  let usersProcessed = 0;
  let scansEnqueued = 0;
  let regressionsDetected = 0;
  let alertEmailsSent = 0;

  for (const sub of subscriptions) {
    usersProcessed += 1;
    const limits = getPlanLimits(sub.plan);

    const [{ data: projectsData }, { data: scansData }, { data: profileData }] = await Promise.all([
      admin
        .from("projects")
        .select("id,url,name")
        .eq("user_id", sub.user_id)
        .order("created_at", { ascending: false })
        .limit(limits.maxProjects),
      admin
        .from("scans")
        .select("id,project_id,url,device,visibility,crawl_enabled,crawl_max_links,created_at,summary_json,report_json")
        .eq("user_id", sub.user_id)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(500),
      admin.from("profiles").select("email").eq("id", sub.user_id).maybeSingle(),
    ]);

    const projects = (projectsData ?? []) as ProjectRow[];
    const scans = (scansData ?? []) as ScanRow[];
    if (projects.length === 0) continue;

    const byProject = new Map<string, ScanRow[]>();
    for (const scan of scans) {
      if (!scan.project_id) continue;
      const existing = byProject.get(scan.project_id) ?? [];
      if (existing.length < 2) {
        existing.push(scan);
        byProject.set(scan.project_id, existing);
      }
    }

    const regressions: Regression[] = [];
    let userScansEnqueued = 0;

    for (const project of projects) {
      const latestScans = byProject.get(project.id) ?? [];
      const latest = latestScans[0];
      const previous = latestScans[1];
      if (!latest) continue;

      const latestCreatedAt = Date.parse(latest.created_at);
      if (Number.isFinite(latestCreatedAt) && now - latestCreatedAt >= rescanThresholdMs) {
        const id = generateId();
        const { error: insertError } = await admin.from("scans").insert({
          id,
          user_id: sub.user_id,
          project_id: project.id,
          url: project.url,
          status: "queued",
          device: latest.device === "desktop" ? "desktop" : "mobile",
          visibility: latest.visibility === "public" ? "public" : "unlisted",
          crawl_enabled: Boolean(latest.crawl_enabled),
          crawl_max_links: Math.max(1, Number(latest.crawl_max_links ?? 1)),
          manage_token_hash: null,
        });

        if (!insertError) {
          try {
            await enqueueQStashJob({
              workerUrl,
              body: { scanId: id, includeSeoAnalysis: true, includeImageAudit: true },
            });
            userScansEnqueued += 1;
            scansEnqueued += 1;
          } catch (enqueueError) {
            console.error("Failed to enqueue weekly scan:", enqueueError);
            await admin
              .from("scans")
              .update({ status: "failed", error: "Failed to enqueue weekly scan", finished_at: new Date().toISOString() })
              .eq("id", id);
          }
        }
      }

      if (previous) {
        const regression = isRegression(previous, latest);
        if (regression.regressed) {
          regressions.push({
            projectUrl: project.url,
            previousScore: regression.summary.previousScore,
            currentScore: regression.summary.currentScore,
            previousCwv: regression.summary.previousCwv,
            currentCwv: regression.summary.currentCwv,
          });
        }
      }
    }

    regressionsDetected += regressions.length;

    const email = profileData?.email as string | undefined;
    if (!email || (regressions.length === 0 && userScansEnqueued === 0)) continue;

    const headline =
      regressions.length > 0
        ? `${regressions.length} regression${regressions.length > 1 ? "s" : ""} detected`
        : "Weekly monitoring run completed";

    const regressionLines = regressions
      .slice(0, 8)
      .map((entry) => {
        const host = hostFromUrl(entry.projectUrl);
        const scorePart =
          entry.previousScore !== null && entry.currentScore !== null
            ? `Score ${entry.previousScore} -> ${entry.currentScore}`
            : "Score change unavailable";
        const cwvPart = `CWV ${entry.previousCwv ?? "-"} -> ${entry.currentCwv ?? "-"}`;
        return `<li><strong>${host}</strong>: ${scorePart}; ${cwvPart}</li>`;
      })
      .join("");

    const result = await sendAlertEmail({
      to: email,
      subject: regressions.length > 0 ? `Speed alerts: ${headline}` : "Weekly monitoring update",
      text:
        regressions.length > 0
          ? `Weekly monitoring found regressions:\n${regressions
              .slice(0, 8)
              .map(
                (entry) =>
                  `${hostFromUrl(entry.projectUrl)}: ${entry.previousScore ?? "-"} -> ${entry.currentScore ?? "-"}`
              )
              .join("\n")}\n\nReview projects: ${baseUrl}/projects`
          : `Weekly monitoring ran successfully. Review projects: ${baseUrl}/projects`,
      html:
        regressions.length > 0
          ? `<p>${headline}.</p><ul>${regressionLines}</ul><p><a href="${baseUrl}/projects">Open projects dashboard</a></p>`
          : `<p>Weekly monitoring ran successfully.</p><p><a href="${baseUrl}/projects">Open projects dashboard</a></p>`,
    });

    if (result.ok) {
      alertEmailsSent += 1;
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      usersProcessed,
      scansEnqueued,
      regressionsDetected,
      alertEmailsSent,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
};
