import type { APIRoute } from "astro";
import { requireAdminApi } from "../../../lib/adminAuth";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { getCacheKey, getCache, setCache } from "../../../lib/cache";
import { logger } from "../../../lib/logger";

const ADMIN_CACHE_TTL = 300; // seconds - funnel counts don't need to be real-time
const DAY_MS = 24 * 60 * 60 * 1000;

// Event types are emitted by src/lib/analytics.ts::trackEvent into the `events`
// table (column `event_type`, timestamped by `created_at`).
const FUNNEL_EVENTS = [
  { label: "Visitors", eventType: "page_view" },
  { label: "Scan Initiated", eventType: "scan_submitted" },
  { label: "Scan Completed", eventType: "scan_completed" },
  { label: "Lead Captured", eventType: "lead_captured" },
  { label: "Upgrade Viewed", eventType: "upgrade_viewed" },
  { label: "Purchase Attempted", eventType: "purchase_attempted" },
] as const;

type FunnelRow = { label: string; eventType: string; last7: number; last30: number };
type FunnelResult = { rows: FunnelRow[]; timestamp: string };

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export const GET: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
  if (denied) return denied;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return json({ error: "Supabase not configured" }, 500);
  }

  try {
    const cacheKey = getCacheKey("admin_funnel_data");
    const cached = getCache<FunnelResult>(cacheKey);
    if (cached) {
      logger.debug("Serving admin funnel data from cache");
      return json(cached, 200, { "Cache-Control": "private, max-age=300" });
    }

    const now = Date.now();
    const last7Iso = new Date(now - 7 * DAY_MS).toISOString();
    const last30Iso = new Date(now - 30 * DAY_MS).toISOString();

    const countEvents = async (eventType: string, sinceIso: string): Promise<number> => {
      const { count, error } = await admin
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", eventType)
        .gte("created_at", sinceIso);
      if (error) throw new Error(error.message);
      return count ?? 0;
    };

    // Every (event, window) count is an independent read - issue all of them
    // together rather than paying ~12 sequential Supabase round-trips.
    const counts = await Promise.all(
      FUNNEL_EVENTS.flatMap(({ eventType }) => [
        countEvents(eventType, last7Iso),
        countEvents(eventType, last30Iso),
      ])
    );

    const rows: FunnelRow[] = FUNNEL_EVENTS.map(({ label, eventType }, i) => ({
      label,
      eventType,
      last7: counts[i * 2],
      last30: counts[i * 2 + 1],
    }));

    const result: FunnelResult = { rows, timestamp: new Date().toISOString() };
    setCache(cacheKey, result, ADMIN_CACHE_TTL);

    return json(result, 200, { "Cache-Control": "private, max-age=300" });
  } catch (error) {
    logger.error("Admin funnel API error:", error);
    return json({ error: "Internal error" }, 500);
  }
};
