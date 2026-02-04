import type { APIRoute } from "astro";

export const POST: APIRoute = async (context) => {
  const supabase = context.locals.supabase;
  if (!supabase) return context.redirect("/signup?error=supabase_not_configured");

  const form = await context.request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "");
  const next = sanitizeNextPath(nextRaw, "/billing");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return context.redirect(`/signup?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);

  // If email confirmations are enabled, the user may not be logged in yet. Still send them somewhere useful.
  return context.redirect(next);
};

function sanitizeNextPath(value: string, fallback: string) {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  return trimmed;
}
