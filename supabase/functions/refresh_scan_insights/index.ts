import { createClient } from "npm:@supabase/supabase-js@2";

type RefreshRequest = {
  start_at?: string | null;
  end_at?: string | null;
  source?: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function logCron(status: "started" | "success" | "failure", details: Record<string, unknown>) {
  const { error } = await supabase.from("cron_log").insert({
    job_name: "refresh_scan_insights",
    status,
    details,
  });

  if (error) {
    console.error("Failed to write cron log", error);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseRequest(url: URL, body: RefreshRequest | null): RefreshRequest {
  return {
    start_at: body?.start_at ?? url.searchParams.get("start_at"),
    end_at: body?.end_at ?? url.searchParams.get("end_at"),
    source: body?.source ?? url.searchParams.get("source") ?? "manual",
  };
}

Deno.serve(async (request) => {
  const startedAt = new Date().toISOString();
  const url = new URL(request.url);

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: RefreshRequest | null = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const params = parseRequest(url, payload);
  const rpcArgs = {
    p_start_at: params.start_at ?? undefined,
    p_end_at: params.end_at ?? undefined,
  };

  await logCron("started", {
    source: params.source,
    started_at: startedAt,
    start_at: params.start_at ?? null,
    end_at: params.end_at ?? null,
  });

  try {
    const { data, error } = await supabase.rpc("aggregate_scan_insights", rpcArgs);

    if (error) {
      await logCron("failure", {
        source: params.source,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        start_at: params.start_at ?? null,
        end_at: params.end_at ?? null,
        error: error.message,
      });
      return json({ ok: false, error: error.message }, 500);
    }

    const groups = Array.isArray(data) ? data : [];
    const metricsWritten = groups.reduce((sum, row) => sum + Number(row.metrics_written ?? 0), 0);

    await logCron("success", {
      source: params.source,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      start_at: params.start_at ?? null,
      end_at: params.end_at ?? null,
      groups_refreshed: groups.length,
      metrics_written: metricsWritten,
    });

    return json({
      ok: true,
      source: params.source,
      groups_refreshed: groups.length,
      metrics_written: metricsWritten,
      groups,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh error";

    await logCron("failure", {
      source: params.source,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      start_at: params.start_at ?? null,
      end_at: params.end_at ?? null,
      error: message,
    });

    return json({ ok: false, error: message }, 500);
  }
});
