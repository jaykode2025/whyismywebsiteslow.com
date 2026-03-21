import type { APIRoute } from "astro";
import { appendLeadAccess, LEAD_ACCESS_COOKIE_NAME } from "../../../lib/leadAccess";
import { saveLead, type Lead } from "../../../lib/leads";
import { trackEvent, updateScanFactStatus } from "../../../lib/analytics";
import { loadStoredReport } from "../../../lib/reports";
import { sendPreviewUnlockedEmail } from "../../../lib/revenueEmails";
import { enqueueQStashJob } from "../../../lib/qstash";
import { env } from "../../../lib/env";

type Payload = {
  email: string;
  reportId?: string;
  next?: string;
  source?: string;
  offerContext?: string;
  ctaVariant?: string;
  company?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  if (!value) return false;
  if (value.length < 5) return false;
  return value.includes("@") && value.includes(".");
}

function safeNextUrl(next: string | undefined, fallback: string, requestUrl: string) {
  if (!next) return fallback;
  try {
    const base = new URL(requestUrl).origin;
    const resolved = new URL(next, base);
    if (resolved.origin !== base) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

function normalizeSource(value: string | undefined): Lead["source"] {
  if (value === "report-sticky-cta") return "report-sticky-cta";
  if (value === "report-preview-gate") return "report-preview-gate";
  if (value === "homepage-offer") return "homepage-offer";
  if (value === "seo-offer") return "seo-offer";
  if ((value ?? "").startsWith("seo-")) return "seo-offer";
  return "preview";
}

async function readPayload(request: Request): Promise<Payload> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return {
      email: String((body as any).email ?? ""),
      reportId: String((body as any).reportId ?? (body as any).report_id ?? ""),
      next: String((body as any).next ?? ""),
      source: String((body as any).source ?? ""),
      offerContext: String((body as any).offerContext ?? (body as any).offer_context ?? ""),
      ctaVariant: String((body as any).ctaVariant ?? (body as any).cta_variant ?? ""),
      company: String((body as any).company ?? ""),
    };
  }
  const form = await request.formData();
  return {
    email: String(form.get("email") ?? ""),
    reportId: String(form.get("reportId") ?? form.get("report_id") ?? ""),
    next: String(form.get("next") ?? ""),
    source: String(form.get("source") ?? ""),
    offerContext: String(form.get("offerContext") ?? form.get("offer_context") ?? ""),
    ctaVariant: String(form.get("ctaVariant") ?? form.get("cta_variant") ?? ""),
    company: String(form.get("company") ?? ""),
  };
}

export const POST: APIRoute = async (context) => {
  const contentType = context.request.headers.get("content-type") ?? "";
  const wantsJson = contentType.includes("application/json");
  const payload = await readPayload(context.request);
  const reportId = payload.reportId?.trim();
  const email = normalizeEmail(payload.email ?? "");
  const source = normalizeSource(payload.source?.trim());
  const offerContext = payload.offerContext?.trim() || null;
  const ctaVariant = payload.ctaVariant?.trim() || null;
  const next = payload.next?.trim();

  const fallback = reportId ? `/report/${reportId}` : "/scan";
  const redirectTo = safeNextUrl(next, fallback, context.request.url);

  if (payload.company) {
    if (wantsJson) {
      return new Response(JSON.stringify({ ok: true, redirectTo }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect(redirectTo);
  }

  if (!isValidEmail(email)) {
    if (wantsJson) {
      return new Response(JSON.stringify({ error: "valid email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return context.redirect(redirectTo);
  }

  await saveLead({
    email,
    reportId: reportId || null,
    source,
    offerContext,
    ctaVariant,
    createdAt: new Date().toISOString(),
    userAgent: context.request.headers.get("user-agent"),
    referer: context.request.headers.get("referer"),
    reportUrl: reportId ? `/report/${reportId}` : null,
  });

  await trackEvent({
    eventType: "preview_unlocked",
    scanId: reportId || null,
    reportId: reportId || null,
    email,
    source,
    offerContext,
    ctaVariant,
    referrer: context.request.headers.get("referer"),
    userAgent: context.request.headers.get("user-agent"),
    path: new URL(context.request.url).pathname,
    metadata: { redirectTo },
  });

  if (reportId) {
    await updateScanFactStatus(reportId, {
      leadSource: source,
    });
  }

  const stored = reportId ? await loadStoredReport(reportId, context.locals) : undefined;
  const report = stored?.status === "done" ? stored.report ?? null : null;
  await sendPreviewUnlockedEmail({
    to: email,
    report,
    reportId: reportId || null,
    origin: new URL(context.request.url).origin,
  });

  const baseUrl = env.APP_BASE_URL() ?? new URL(context.request.url).origin;
  if (reportId && env.QSTASH_TOKEN()) {
    const workerUrl = `${baseUrl}/api/worker/follow-up`;
    try {
      await enqueueQStashJob({
        workerUrl,
        delay: "1d",
        body: {
          kind: "preview-reminder",
          email,
          reportId,
        },
      });
    } catch (error) {
      console.error("Failed to schedule preview reminder:", error);
    }
  }

  if (reportId) {
    const existing = context.cookies.get(LEAD_ACCESS_COOKIE_NAME)?.value;
    const nextCookieValue = appendLeadAccess(existing, reportId);
    context.cookies.set(LEAD_ACCESS_COOKIE_NAME, nextCookieValue, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(context.request.url).protocol === "https:",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (wantsJson) {
    return new Response(JSON.stringify({ ok: true, redirectTo }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return context.redirect(redirectTo);
};
