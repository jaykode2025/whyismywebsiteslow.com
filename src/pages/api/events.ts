import type { APIRoute } from "astro";
import { trackEvent } from "../../lib/analytics";

type EventPayload = {
  eventType?: unknown;
  source?: unknown;
  ctaVariant?: unknown;
  offerContext?: unknown;
  scanId?: unknown;
  reportId?: unknown;
  projectId?: unknown;
  metadata?: unknown;
};

function asString(value: unknown, max = 120) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export const POST: APIRoute = async (context) => {
  const body = (await context.request.json().catch(() => ({}))) as EventPayload;
  const eventType = asString(body.eventType, 80);
  if (!eventType) {
    return new Response(JSON.stringify({ error: "eventType required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const metadata = body.metadata && typeof body.metadata === "object"
    ? (body.metadata as Record<string, unknown>)
    : {};

  await trackEvent({
    eventType,
    scanId: asString(body.scanId),
    reportId: asString(body.reportId),
    projectId: asString(body.projectId),
    userId: context.locals.user?.id ?? null,
    source: asString(body.source),
    ctaVariant: asString(body.ctaVariant),
    offerContext: asString(body.offerContext),
    referrer: context.request.headers.get("referer"),
    userAgent: context.request.headers.get("user-agent"),
    path: new URL(context.request.url).pathname,
    metadata,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
