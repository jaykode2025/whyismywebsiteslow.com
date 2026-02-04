import type { APIContext } from "astro";

export async function requireUser(context: APIContext) {
  const supabase = context.locals.supabase;
  if (!supabase) {
    return new Response(JSON.stringify({ error: "Supabase not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data } = await supabase.auth.getUser();
  const user = data?.user ?? null;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { supabase, user };
}

