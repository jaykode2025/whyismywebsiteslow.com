import type { APIRoute } from "astro";
import { env, hasSupabaseEnv } from "../../lib/env";
import { listReports } from "../../lib/store";

export const GET: APIRoute = async () => {
  const debug = {
    timestamp: new Date().toISOString(),
    env: {
      hasSupabase: hasSupabaseEnv(),
      hasQstash: Boolean(env.QSTASH_TOKEN()),
      hasStripe: Boolean(env.STRIPE_SECRET_KEY()),
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
