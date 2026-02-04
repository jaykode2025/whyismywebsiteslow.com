import type { APIRoute } from "astro";
import { saveLead } from "../../../lib/leads";

type Payload = {
  email: string;
  reportId?: string;
  next?: string;
  source?: string;
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

async function readPayload(request: Request): Promise<Payload> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return {
      email: String((body as any).email ?? ""),
      reportId: String((body as any).reportId ?? (body as any).report_id ?? ""),
      next: String((body as any).next ?? ""),
      source: String((body as any).source ?? ""),
      company: String((body as any).company ?? ""),
    };
  }
  const form = await request.formData();
  return {
    email: String(form.get("email") ?? ""),
    reportId: String(form.get("reportId") ?? form.get("report_id") ?? ""),
    next: String(form.get("next") ?? ""),
    source: String(form.get("source") ?? ""),
    company: String(form.get("company") ?? ""),
  };
}

export const POST: APIRoute = async (context) => {
  const payload = await readPayload(context.request);
  const reportId = payload.reportId?.trim();
  const email = normalizeEmail(payload.email ?? "");
  const next = payload.next?.trim();

  const fallback = reportId ? `/report/${reportId}` : "/scan";
  const redirectTo = safeNextUrl(next, fallback, context.request.url);

  if (payload.company) {
    return context.redirect(redirectTo);
  }

  if (!isValidEmail(email)) {
    if ((context.request.headers.get("content-type") ?? "").includes("application/json")) {
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
    source: "preview",
    createdAt: new Date().toISOString(),
    userAgent: context.request.headers.get("user-agent"),
    referer: context.request.headers.get("referer"),
    reportUrl: reportId ? `/report/${reportId}` : null,
  });

  return context.redirect(redirectTo);
};
