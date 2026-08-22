import type { APIRoute } from "astro";
import { sanitizeNextPath } from "../../../lib/safeRedirect";

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  if (!supabase) return context.redirect("/login?error=supabase_not_configured");

  const form = await context.request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "");
  const next = sanitizeNextPath(nextRaw, "/billing");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return context.redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);

  return context.redirect(next);
};
