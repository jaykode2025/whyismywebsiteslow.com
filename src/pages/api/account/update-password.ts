import type { APIRoute } from "astro";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";
import { sanitizeNextPath } from "../../../lib/safeRedirect";

// Used both from /account (a logged-in user changing their password on
// purpose) and from /reset-password (after exchanging a recovery code for a
// session) - both cases just need "the current request has an authenticated
// Supabase session, set a new password for it."
export const POST: APIRoute = async (context) => {
  const csrfValid = await verifyCsrfTokenFromRequest(context.request);
  if (!csrfValid) {
    return context.redirect("/account?error=" + encodeURIComponent("Session expired, please try again."));
  }

  const supabase = context.locals.supabase;
  if (!supabase) {
    return context.redirect("/account?error=" + encodeURIComponent("Not configured."));
  }

  const { data } = await supabase.auth.getUser();
  if (!data?.user) {
    return context.redirect("/login?next=%2Faccount");
  }

  const form = await context.request.formData();
  const password = String(form.get("password") ?? "");
  const redirectTo = sanitizeNextPath(String(form.get("redirectTo") ?? ""), "/account");
  const join = redirectTo.includes("?") ? "&" : "?";

  if (password.length < 8) {
    return context.redirect(`${redirectTo}${join}error=${encodeURIComponent("Password must be at least 8 characters.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return context.redirect(`${redirectTo}${join}error=${encodeURIComponent(error.message)}`);
  }

  return context.redirect(`${redirectTo}${join}updated=password`);
};
