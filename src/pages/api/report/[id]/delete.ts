import type { APIRoute } from "astro";
import { deleteReport, getReport } from "../../../../lib/store";
import { hasSupabaseEnv } from "../../../../lib/env";
import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { hashToken } from "../../../../lib/tokens";

interface DeleteRequestBody {
  manageToken?: string;
}

export const POST: APIRoute = async (context) => {
  const id = context.params.id ?? "";
  const body = await context.request.json().catch(() => ({}));
  const { manageToken: token } = body as DeleteRequestBody;

  if (hasSupabaseEnv() && context.locals.supabase) {
    // If owner is logged in, allow delete via RLS policy.
    if (context.locals.user) {
      const { data: deleted, error } = await context.locals.supabase.from("scans").delete().eq("id", id).select("id");
      if (!error && (deleted?.length ?? 0) > 0) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // Fall through to token-based delete for non-owners.
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing manage token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const admin = createSupabaseAdminClient();
    if (!admin) {
      return new Response(JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY not set" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tokenHash = hashToken(token);
    const { data: deleted, error: deleteError } = await admin
      .from("scans")
      .delete()
      .eq("id", id)
      .eq("manage_token_hash", tokenHash)
      .select("id");
    if (deleteError) {
      return new Response(JSON.stringify({ error: "Failed to delete report" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!deleted?.length) {
      return new Response(JSON.stringify({ error: "Invalid manage token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stored = getReport(id);
  if (!stored?.report) {
    return new Response(JSON.stringify({ error: "Report not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing manage token" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokenHash = hashToken(token);
  if (stored.report.manage.writeTokenHash !== tokenHash) {
    return new Response(JSON.stringify({ error: "Invalid manage token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  deleteReport(id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
