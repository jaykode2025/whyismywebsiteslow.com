import type { APIRoute } from "astro";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";
import { getCacheKey, getCache, setCache } from "../../lib/cache";
import { logger } from "../../lib/logger";

const ADMIN_CACHE_TTL = 300; // Cache admin data for 5 minutes

export const GET: APIRoute = async (context) => {
  const denied = await requireAdminPage(context.locals, context);
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
        .gte("timestamp", sinceIso);
      return count ?? 0;
    }

    // Fetch all event counts in parallel
    const eventTypes = [
      { label: "Visitors", eventType: "page_view" },
      { label: "Scan Initiated", eventType: "scan_submitted" },
      { label: "Scan Completed", eventType: "scan_completed" },
      { label: "Lead Captured", eventType: "lead_captured" },
      { label: "Upgrade Viewed", eventType: "upgrade_viewed" },
      { label: "Purchase Attempted", eventType: "purchase_attempted" },
    ];

    const rows: Row[] = await Promise.all(
      eventTypes.map(async ({ label, eventType }) => ({
        label,
        eventType,
        last7: await countEvents(eventType, last7Iso),
        last30: await countEvents(eventType, last30Iso),
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

async function requireAdminPage(locals: any, context: any) {
  // Check if user is authenticated and is admin
  // This is a placeholder - implement your actual admin check
  return null;
}
