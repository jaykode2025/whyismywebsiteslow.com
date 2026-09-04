import type { APIRoute } from "astro";
import { env, hasSupabaseEnv } from "../../lib/env";
import { listReports } from "../../lib/store";

export const GET: APIRoute = async ({ request }) => {
  const expectedKey = env.INTERNAL_DASHBOARD_KEY();
  if (!expectedKey) {
    // No key configured means this internal endpoint isn't set up for safe
    // use in this environment - fail closed rather than exposing it.
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
      hasSupabase: hasSupabaseEnv(),
      hasQstash: Boolean(env.QSTASH_TOKEN()),
      hasStripe: Boolean(env.STRIPE_SECRET_KEY()),
      hasOpenAI: Boolean(env.OPENAI_API_KEY()),
      appBaseUrl: env.APP_BASE_URL() || "not set",
      hasChromiumExecutablePath: Boolean(env.CHROME_EXECUTABLE_PATH()),
    },
    reports: {
      total: listReports().size,
      statuses: Array.from(listReports().values()).reduce((acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    },
    memory: process.memoryUsage()
  };

  return new Response(JSON.stringify(debug, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
};
