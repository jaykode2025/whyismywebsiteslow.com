import type { APIRoute } from "astro";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { getCacheKey, getCache, setCache } from "../../../lib/cache";
import { logger } from "../../../lib/logger";
import { requireAdminApi } from "../../../lib/adminAuth";

const ADMIN_CACHE_TTL = 300; // Cache admin data for 5 minutes

export const GET: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: "Supabase not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const cacheKey = getCacheKey("admin_funnel_data");
    const cached = getCache<any>(cacheKey);
    if (cached) {
      logger.debug("Serving admin funnel data from cache");
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    const now = Date.now();
    const last7Iso = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const last30Iso = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    type Row = {
      label: string;
      eventType: string;
      fallbackEventType?: string;
      last7: number;
      last30: number;
    };

    async function countEvents(eventType: string, sinceIso: string) {
      if (!admin) return 0;
      const { count } = await admin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", eventType)
        .gte("created_at", sinceIso);
      return count ?? 0;
    }

    async function countWithFallback(primary: string, fallback: string | undefined, sinceIso: string) {
      const primaryCount = await countEvents(primary, sinceIso);
      if (primaryCount > 0 || !fallback) return primaryCount;
      return countEvents(fallback, sinceIso);
    }

    // These names match events emitted by the scan, report, lead, and Stripe flows.
    const eventTypes = [
      { label: "Scans started", eventType: "scan_started", fallbackEventType: "scan_submitted" },
      { label: "Scans completed", eventType: "scan_completed" },
      { label: "Report views", eventType: "report_viewed" },
      { label: "Example report views", eventType: "example_report_viewed" },
      { label: "Unlock CTA clicks", eventType: "unlock_cta_clicked" },
      { label: "Checkouts started", eventType: "checkout_started", fallbackEventType: "report_checkout_started" },
      { label: "Purchases completed", eventType: "purchase_completed", fallbackEventType: "report_purchased" },
      { label: "Subscriptions started", eventType: "subscription_started", fallbackEventType: "subscription_activated" },
      { label: "Service leads submitted", eventType: "service_lead_submitted" },
    ];

    const rows: Row[] = await Promise.all(
      eventTypes.map(async ({ label, eventType, fallbackEventType }) => ({
        label,
        eventType,
        fallbackEventType,
        last7: await countWithFallback(eventType, fallbackEventType, last7Iso),
        last30: await countWithFallback(eventType, fallbackEventType, last30Iso),
      }))
    );

    const result = { rows, timestamp: new Date().toISOString() };
    setCache(cacheKey, result, ADMIN_CACHE_TTL);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    logger.error("Admin funnel API error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

