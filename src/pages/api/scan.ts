import type { APIRoute } from "astro";
import { createReportPlaceholder, setReport, setReportStatus } from "../../lib/store";
import { rateLimit } from "../../lib/slidingRateLimit";
import { normalizeUrl, clampLinks } from "../../lib/validate";
import { runEnhancedScan } from "../../lib/scan.enhanced";
import { env, hasSupabaseEnv } from "../../lib/env";
import { generateId, generateToken, hashToken } from "../../lib/tokens";
import { enqueueQStashJob } from "../../lib/qstash";
import { getPlanLimits, getUserPlan } from "../../lib/plan";
import { verifyCsrfTokenFromRequest } from "../../lib/csrf";
import { recordScanFact, trackEvent } from "../../lib/analytics";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";

export const POST: APIRoute = async (context) => {
  const { request, clientAddress, locals } = context;
  
  // Verify CSRF token for non-GET requests
  const csrfValid = await verifyCsrfTokenFromRequest(request);
  if (!csrfValid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  try {
    const body = await request.json();
    const normalized = normalizeUrl(body.url);
    const hostKey = normalized.hostname;
    const ipKey = clientAddress ?? "unknown";
    const bucket = rateLimit(`${ipKey}:${hostKey}`);

    if (!bucket.ok) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": bucket.resetAt.toString(),
        },
      });
    }

    const device = body.device === "desktop" ? "desktop" : "mobile";
    const maxLinks = clampLinks(body?.crawl?.maxLinks ?? 0);
    const crawlEnabled = Boolean(body?.crawl?.enabled && maxLinks > 1);
    const visibility = body.visibility === "public" ? "public" : "unlisted";
    const targetKeyword = typeof body?.targetKeyword === "string" ? body.targetKeyword.trim() : undefined;
    const includeSeoAnalysis = body?.includeSeoAnalysis !== false;
    const includeImageAudit = body?.includeImageAudit !== false;

    if (hasSupabaseEnv() && env.QSTASH_TOKEN() && locals.supabase) {
      const id = generateId();
      const manageToken = locals.user ? undefined : generateToken();
      const manageTokenHash = manageToken ? hashToken(manageToken) : null;
      let userPlanInfo: Awaited<ReturnType<typeof getUserPlan>> | null = null;
      let planLimits = getPlanLimits("free");

      if (locals.user) {
        userPlanInfo = await getUserPlan(locals.supabase, locals.user.id);
        planLimits = getPlanLimits(userPlanInfo.plan);

        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        const { count: scanCount, error: scanCountError } = await locals.supabase
          .from("scans")
          .select("id", { count: "exact", head: true })
          .eq("user_id", locals.user.id)
          .gte("created_at", startOfMonth.toISOString());

        if (scanCountError) throw new Error(scanCountError.message);
        if ((scanCount ?? 0) >= planLimits.monthlyScanLimit) {
          return new Response(
            JSON.stringify({
              error: `Monthly scan limit reached (${planLimits.monthlyScanLimit}). Upgrade for higher limits.`,
              code: "monthly_scan_limit",
              plan: userPlanInfo.plan,
              limit: planLimits.monthlyScanLimit,
            }),
            {
              status: 402,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      }

      let projectId: string | null = null;
      if (locals.user) {
        // Create/find a project for this URL (simple MVP: 1 project per exact url string)
        const { data: existing, error: projectError } = await locals.supabase
          .from("projects")
          .select("id")
          .eq("user_id", locals.user.id)
          .eq("url", normalized.toString())
          .maybeSingle();
        if (projectError) throw new Error(projectError.message);
        if (existing?.id) projectId = existing.id;
      }

      // Project limits by plan.
      if (locals.user && !projectId) {
        const planInfo = userPlanInfo ?? (await getUserPlan(locals.supabase, locals.user.id));

        const { count: projectCount } = await locals.supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("user_id", locals.user.id);

        if ((projectCount ?? 0) >= planLimits.maxProjects) {
          return new Response(
            JSON.stringify({
              error: `Project limit reached (${planLimits.maxProjects}). Upgrade for more projects.`,
              code: "project_limit_reached",
              plan: planInfo.plan,
              limit: planLimits.maxProjects,
            }),
            {
              status: 402,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        try {
          const { data: created, error: createErr } = await locals.supabase
            .from("projects")
            .upsert({ user_id: locals.user.id, url: normalized.toString(), name: normalized.hostname }, { onConflict: 'user_id,url' })
            .select("id")
            .single();
          if (createErr) throw new Error(createErr.message);
          projectId = created.id;
        } catch (err: any) {
          if (err.message?.includes('duplicate key')) {
            const { data: existing } = await locals.supabase
              .from("projects")
              .select("id")
              .eq("user_id", locals.user.id)
              .eq("url", normalized.toString())
              .single();
            projectId = existing?.id;
          } else {
            throw err;
          }
        }
      }

      const { error: insertError } = await locals.supabase.from("scans").insert({
        id,
        user_id: locals.user?.id ?? null,
        project_id: projectId,
        url: normalized.toString(),
        status: "queued",
        device,
        visibility,
        crawl_enabled: crawlEnabled,
        crawl_max_links: Math.max(1, maxLinks),
        manage_token_hash: manageTokenHash,
      });
      if (insertError) throw new Error(insertError.message);

      const baseUrl = env.APP_BASE_URL();
      if (!baseUrl) {
        throw new Error("APP_BASE_URL environment variable is required for production");
      }
      const workerUrl = `${baseUrl}/api/worker/scan`;
      await enqueueQStashJob({
        workerUrl,
        body: { scanId: id, targetKeyword, includeSeoAnalysis, includeImageAudit },
      });

      await trackEvent({
        eventType: "scan_submitted",
        scanId: id,
        projectId,
        userId: locals.user?.id ?? null,
        source: "scan-form",
        referrer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
        path: new URL(request.url).pathname,
        metadata: {
          url: normalized.toString(),
          device,
          visibility,
          crawlEnabled,
          maxLinks: Math.max(1, maxLinks),
        },
      });
      await trackEvent({
        eventType: "scan_started",
        scanId: id,
        projectId,
        userId: locals.user?.id ?? null,
        source: "scan-form",
        referrer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
        path: new URL(request.url).pathname,
        metadata: {
          url: normalized.toString(),
          device,
          visibility,
          crawlEnabled,
          maxLinks: Math.max(1, maxLinks),
        },
      });

      return new Response(JSON.stringify({ id, manageToken }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": bucket.remaining.toString(),
          "X-RateLimit-Reset": bucket.resetAt.toString(),
        },
      });
    }

    // Local fallback: run synchronously. Save to Supabase when configured, else file store.
    const manageToken = generateToken();
    const admin = createSupabaseAdminClient();
    let id: string;
    let writeTokenHash: string;
    let savedToSupabase = false;

    if (hasSupabaseEnv() && admin) {
      id = generateId();
      writeTokenHash = hashToken(manageToken);
      const startedAt = new Date().toISOString();
      const { error: insertError } = await admin.from("scans").insert({
        id,
        user_id: locals.user?.id ?? null,
        project_id: null,
        url: normalized.toString(),
        status: "running",
        device,
        visibility,
        crawl_enabled: crawlEnabled,
        crawl_max_links: Math.max(1, maxLinks),
        manage_token_hash: writeTokenHash,
        started_at: startedAt,
      });
      if (!insertError) {
        savedToSupabase = true;
      } else {
        console.error("Scan insert failed (Supabase), falling back to file store:", insertError);
        const placeholder = await createReportPlaceholder(
          {
            url: normalized.toString(),
            device,
            crawl: { enabled: crawlEnabled, maxLinks: Math.max(1, maxLinks) },
            visibility,
          },
          manageToken
        );
        id = placeholder.id;
        writeTokenHash = placeholder.writeTokenHash;
      }
    } else {
      const placeholder = await createReportPlaceholder(
        {
          url: normalized.toString(),
          device,
          crawl: { enabled: crawlEnabled, maxLinks: Math.max(1, maxLinks) },
          visibility,
        },
        manageToken
      );
      id = placeholder.id;
      writeTokenHash = placeholder.writeTokenHash;
    }

    try {
      if (!savedToSupabase) {
        await setReportStatus(id, "running");
      }
      const report = await runEnhancedScan(
        id,
        {
          url: normalized.toString(),
          device,
          crawl: { enabled: crawlEnabled, maxLinks: Math.max(1, maxLinks) },
          visibility,
        },
        writeTokenHash,
        { includeSeoAnalysis, includeImageAudit, targetKeyword }
      );

      if (savedToSupabase && admin) {
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
          .eq("id", id);
      } else {
        await setReport(id, report);
      }

      const { data: subscription } = locals.user && admin
        ? await admin.from("subscriptions").select("status").eq("user_id", locals.user.id).maybeSingle()
        : { data: null };
      await recordScanFact(report, {
        unlockStatus: "locked",
        subscriptionStatus: subscription?.status ?? "free",
        serviceLeadStatus: "none",
      }, admin ?? undefined);
      await trackEvent({
        eventType: "scan_submitted",
        scanId: id,
        source: "scan-form",
        referrer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
        path: new URL(request.url).pathname,
        metadata: {
          url: normalized.toString(),
          device,
          visibility,
          crawlEnabled,
          maxLinks: Math.max(1, maxLinks),
          localMode: true,
        },
      }, admin ?? undefined);
      await trackEvent({
        eventType: "scan_started",
        scanId: id,
        source: "scan-form",
        referrer: request.headers.get("referer"),
        userAgent: request.headers.get("user-agent"),
        path: new URL(request.url).pathname,
        metadata: {
          url: normalized.toString(),
          device,
          visibility,
          crawlEnabled,
          maxLinks: Math.max(1, maxLinks),
          localMode: true,
        },
      }, admin ?? undefined);
      await trackEvent({
        eventType: "scan_completed",
        scanId: id,
        reportId: id,
        userId: locals.user?.id ?? null,
        source: "sync-scan",
        path: new URL(request.url).pathname,
        metadata: {
          score100: report.summary.score100,
          cwvStatus: report.psi.cwv.status,
          localMode: true,
        },
      }, admin ?? undefined);
    } catch (error: any) {
      if (savedToSupabase && admin) {
        await admin
          .from("scans")
          .update({ status: "failed", error: error?.message ?? "Scan failed", finished_at: new Date().toISOString() })
          .eq("id", id);
      } else {
        await setReportStatus(id, "failed", error?.message ?? "Scan failed");
      }
      return new Response(JSON.stringify({ error: "Scan execution failed", id }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": bucket.remaining.toString(),
          "X-RateLimit-Reset": bucket.resetAt.toString(),
        },
      });
    }

    return new Response(JSON.stringify({ id, manageToken }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Remaining": bucket.remaining.toString(),
        "X-RateLimit-Reset": bucket.resetAt.toString(),
      },
    });
  } catch (error: any) {
    console.error("Scan API error:", error);
    const isClientError =
      error?.message?.includes("url") ||
      error?.message?.includes("normalize") ||
      error instanceof SyntaxError;
    const status = isClientError ? 400 : 500;
    const message = isClientError ? "Invalid request" : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
