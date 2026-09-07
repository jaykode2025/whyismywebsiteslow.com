import type { APIRoute } from "astro";
import { env, hasSupabaseEnv } from "../../lib/env";

export const GET: APIRoute = async ({ request, locals }) => {
  const expectedKey = env.INTERNAL_DASHBOARD_KEY();
  if (!expectedKey) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const providedKey =
    request.headers.get("x-internal-dashboard-key") ??
    new URL(request.url).searchParams.get("key");
  if (providedKey !== expectedKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const debug = {
    timestamp: new Date().toISOString(),
    env: {
      supabaseConfigured: hasSupabaseEnv(),
      qstashConfigured: Boolean(env.QSTASH_TOKEN()),
    },
    cache: {
      // Include cache stats if available
      reportsInMemory: 0, // Will be populated if you add cache stats
    },
  };

  return new Response(JSON.stringify(debug, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // Add cache headers for static debug output
      "Cache-Control": "private, no-cache",
    },
  });
};
