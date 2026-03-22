import type { APIRoute } from "astro";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const prerender = false;

type RecentScan = {
  url: string;
  score: number;
  time: string;
};

function toRelativeTime(dateInput: string | null): string {
  if (!dateInput) return "recently";

  const now = Date.now();
  const then = new Date(dateInput).getTime();
  const diffMs = Math.max(0, now - then);

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function normalizeUrl(raw: string | null): string {
  if (!raw) return "unknown-site.com";

  try {
    const withProtocol = raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `https://${raw}`;

    const parsed = new URL(withProtocol);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function maskHostname(raw: string | null): string {
  const host = normalizeUrl(raw);
  const parts = host.split(".");
  if (parts.length < 2) return host;

  const name = parts[0];
  const tld = parts.slice(1).join(".");
  const masked = name.length <= 4
    ? `${name[0]}***`
    : `${name.slice(0, 2)}***`;

  return `${masked}.${tld}`;
}

function clampScore(value: unknown): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const GET: APIRoute = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    if (!supabase) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }

    const { data, error } = await supabase
      .from("scans")
      .select("url, summary_json, created_at")
      .eq("status", "done")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.error("recent scans fetch error:", error.message);

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      });
    }

    const scans: RecentScan[] = (data ?? []).slice(0, 4).map((row) => ({
      url: maskHostname(row.url),
      score: clampScore(row.summary_json?.score100),
      time: toRelativeTime(row.created_at),
    }));

    return new Response(JSON.stringify(scans), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("recent scans endpoint failed:", err);

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  }
};
