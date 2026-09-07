import type { APIRoute } from "astro";
import { requireAdminMutation } from "../../../lib/adminAuth";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export const POST: APIRoute = async (context) => {
  const denied = await requireAdminMutation(context);
  if (denied) return denied;

  const csrfValid = await verifyCsrfTokenFromRequest(context.request);
  if (!csrfValid) {
    return new Response(JSON.stringify({ error: "Invalid CSRF token" }), { status: 403 });
  }

  const form = await context.request.formData();
  const code = String(form.get("code") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const commissionPct = Number(form.get("commissionPct") ?? 20);

  if (!/^[a-zA-Z0-9_-]{2,40}$/.test(code) || !name) {
    return context.redirect(
      `/admin/affiliates?error=${encodeURIComponent("Code must be 2-40 letters/digits/-/_ and name is required.")}`
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: "Supabase admin not configured" }), { status: 500 });
  }

  const { error } = await admin.from("affiliates").insert({
    code,
    name,
    email: email || null,
    commission_pct: Number.isFinite(commissionPct) ? Math.min(100, Math.max(0, commissionPct)) : 20,
  });

  if (error) {
    const message = (error as any).code === "23505" ? `Code "${code}" is already taken.` : error.message;
    return context.redirect(`/admin/affiliates?error=${encodeURIComponent(message)}`);
  }

  return context.redirect(`/admin/affiliates?created=1`);
};
