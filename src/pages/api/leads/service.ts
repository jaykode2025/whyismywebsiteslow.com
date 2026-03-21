import type { APIRoute } from "astro";
import { saveServiceLead } from "../../../lib/serviceLeads";
import { trackEvent, updateScanFactStatus } from "../../../lib/analytics";
import { sendServiceLeadConfirmation, sendServiceLeadNotification } from "../../../lib/revenueEmails";

type Payload = {
  email: string;
  websiteUrl?: string;
  reportId?: string;
  notes?: string;
  source?: string;
  offerContext?: string;
  ctaVariant?: string;
  company?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return value.includes("@") && value.includes(".");
}

function normalizeUrl(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

async function readPayload(request: Request): Promise<Payload> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return {
      email: String((body as any).email ?? ""),
      websiteUrl: String((body as any).websiteUrl ?? (body as any).website_url ?? ""),
      reportId: String((body as any).reportId ?? (body as any).report_id ?? ""),
      notes: String((body as any).notes ?? ""),
      source: String((body as any).source ?? ""),
      offerContext: String((body as any).offerContext ?? (body as any).offer_context ?? ""),
      ctaVariant: String((body as any).ctaVariant ?? (body as any).cta_variant ?? ""),
      company: String((body as any).company ?? ""),
    };
  }

  const form = await request.formData();
  return {
    email: String(form.get("email") ?? ""),
    websiteUrl: String(form.get("websiteUrl") ?? form.get("website_url") ?? ""),
    reportId: String(form.get("reportId") ?? form.get("report_id") ?? ""),
    notes: String(form.get("notes") ?? ""),
    source: String(form.get("source") ?? "service"),
    offerContext: String(form.get("offerContext") ?? form.get("offer_context") ?? ""),
    ctaVariant: String(form.get("ctaVariant") ?? form.get("cta_variant") ?? ""),
    company: String(form.get("company") ?? ""),
  };
}

export const POST: APIRoute = async (context) => {
  const contentType = context.request.headers.get("content-type") ?? "";
  const wantsJson = contentType.includes("application/json");
  const payload = await readPayload(context.request);

  if (payload.company) {
    return wantsJson
      ? new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      : context.redirect("/fix-it?sent=1");
  }

  const email = normalizeEmail(payload.email ?? "");
  if (!isValidEmail(email)) {
    return wantsJson
      ? new Response(JSON.stringify({ error: "valid email required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      : context.redirect("/fix-it?error=email");
  }

  const websiteUrl = normalizeUrl(payload.websiteUrl);
  const reportId = payload.reportId?.trim() || null;
  const source = payload.source?.trim() || "service";
  const offerContext = payload.offerContext?.trim() || "service";
  const ctaVariant = payload.ctaVariant?.trim() || "secondary";

  const lead = {
    email,
    websiteUrl,
    reportId,
    notes: payload.notes?.trim() || null,
    source,
    offerContext,
    ctaVariant,
    createdAt: new Date().toISOString(),
    userAgent: context.request.headers.get("user-agent"),
    referer: context.request.headers.get("referer"),
  };

  await saveServiceLead(lead);

  await trackEvent({
    eventType: "service_lead_submitted",
    scanId: reportId,
    reportId,
    email,
    source,
    offerContext,
    ctaVariant,
    referrer: context.request.headers.get("referer"),
    userAgent: context.request.headers.get("user-agent"),
    path: new URL(context.request.url).pathname,
    metadata: {
      websiteUrl,
    },
  });

  if (reportId) {
    await updateScanFactStatus(reportId, { serviceLeadStatus: "requested" });
  }

  await sendServiceLeadConfirmation({
    lead,
    origin: new URL(context.request.url).origin,
  });
  await sendServiceLeadNotification({
    lead,
    origin: new URL(context.request.url).origin,
  });

  return wantsJson
    ? new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    : context.redirect("/fix-it?sent=1");
};
