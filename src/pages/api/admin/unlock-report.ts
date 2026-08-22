import type { APIRoute } from "astro";
import { requireAdminApi } from "../../../lib/adminAuth";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";
import { unlockReport } from "../../../lib/entitlements";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const POST: APIRoute = async (context) => {
  const denied = await requireAdminApi(context);
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
  await unlockReport(reportId, "admin-override", { supabase: admin });

  return context.redirect(`/admin/reports?id=${encodeURIComponent(reportId)}&unlocked=1`);
};
