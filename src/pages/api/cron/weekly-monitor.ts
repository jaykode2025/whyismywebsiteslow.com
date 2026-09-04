import type { APIRoute } from "astro";
import { env } from "../../../lib/env";
import { timingSafeStringEqual } from "../../../lib/timingSafe";

/**
 * Vercel Cron entry point for the weekly monitoring run. worker/weekly-monitor.ts
 * (the actual job) was fully built and correctly wired to Stripe/Supabase/Resend,
 * but nothing ever triggered it - no vercel.json, no scheduler. This is that
 * trigger: a GET endpoint Vercel Cron can call (see vercel.json), which then
 * calls the real worker with the same Bearer-token auth every other worker
 * route already uses.
 *
 * Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}` on
 * every cron-triggered request when the CRON_SECRET env var is set on the
 * project - that's what gates this endpoint, so only Vercel's own scheduler
 * (or someone with that secret) can kick off a run.
 */
export const GET: APIRoute = async ({ request }) => {
  const expected = env.CRON_SECRET();
  const auth = request.headers.get("authorization") ?? "";
  if (!expected || !timingSafeStringEqual(auth, `Bearer ${expected}`)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const qstashToken = env.QSTASH_TOKEN();
  if (!qstashToken) {
    return new Response(JSON.stringify({ error: "QSTASH_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseUrl = env.APP_BASE_URL() ?? new URL(request.url).origin;
  const workerRes = await fetch(`${baseUrl}/api/worker/weekly-monitor`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${qstashToken}`,
      "Content-Type": "application/json",
    },
  });

  const body = await workerRes.text();
  return new Response(body, {
    status: workerRes.status,
    headers: { "Content-Type": "application/json" },
  });
};
