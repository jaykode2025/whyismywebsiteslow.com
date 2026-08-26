import type { APIRoute } from "astro";
import { requireAdminMutation } from "../../../lib/adminAuth";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";
import { unlockReport } from "../../../lib/entitlements";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const POST: APIRoute = async (context) => {
  const denied = await requireAdminMutation(context);
  if (denied) return denied;

  const csrfValid = await verifyCsrfTokenFromRequest(context.request);
  if (!csrfValid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), { status: 403 });
  }

  const form = await context.request.formData();
  const reportId = String(form.get("reportId") ?? "");
  if (!reportId) {
    return new Response(JSON.stringify({ error: "reportId required" }), { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  // requireAdminMutation guarantees a real admin user here (never the shared
  // key), so stash their id for a minimal audit trail without a schema change.
  await unlockReport(reportId, `admin-override:${context.locals.user?.id ?? "unknown"}`, { supabase: admin });

  return context.redirect(`/admin/reports?id=${encodeURIComponent(reportId)}&unlocked=1`);
};
