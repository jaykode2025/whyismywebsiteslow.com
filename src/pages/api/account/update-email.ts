import type { APIRoute } from "astro";
import { verifyCsrfTokenFromRequest } from "../../../lib/csrf";

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
  const email = String(form.get("email") ?? "").trim();
  if (!email) {
    return context.redirect("/account?error=" + encodeURIComponent("Email is required."));
  }

  const { error } = await supabase.auth.updateUser({ email });
  if (error) {
    return context.redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  // Supabase sends a confirmation link to the new address; the email on
  // the account doesn't actually change until that link is clicked.
  return context.redirect("/account?updated=email");
};
