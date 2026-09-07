import type { APIRoute } from "astro";
import { createSupabaseAdminClient } from "../../lib/supabase/admin";
import { getCacheKey, getCache, setCache } from "../../lib/cache";
import { logger } from "../../lib/logger";

const CACHE_TTL = 60; // Cache for 1 minute

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      });
    }

    // Check cache first
    const cacheKey = getCacheKey("recent_scans");
    const cachedScans = getCache<any[]>(cacheKey);
    if (cachedScans) {
      logger.debug("Serving recent scans from cache");
      return new Response(JSON.stringify(cachedScans), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }

    // Fetch from database
    const { data: scans, error } = await admin
      .from("scans")
      .select("url, summary_json, created_at")
      .eq("status", "done")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      logger.error("recent scans fetch error:", error.message);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      });
    }

    const maskHostname = (url: string) => {
      try {
        const { hostname } = new URL(url);
        return hostname.replace(/^www\./, "");
      } catch {
        return url;
      }
    };
    const clampScore = (score: any) => {
      const num = Number(score);
      return isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 0;
    };
    const toRelativeTime = (date: string) => {
      const ms = Date.now() - new Date(date).getTime();
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      return "just now";
    };

    type RecentScan = {
      url: string;
      score: number;
      time: string;
    };
    const scansData: RecentScan[] = (data ?? [])
      .slice(0, 4)
      .map((row: any) => ({
        url: maskHostname(row.url),
        score: clampScore(row.summary_json?.score100),
        time: toRelativeTime(row.created_at),
      }));

    // Cache the result
    setCache(cacheKey, scansData, CACHE_TTL);

    return new Response(JSON.stringify(scansData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    logger.error("Unexpected error in recent scans API:", error);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
