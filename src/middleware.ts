import { defineMiddleware } from "astro/middleware";
import { createSupabaseServerClient } from "./lib/supabase/server";
import { hasSupabaseEnv } from "./lib/env";

export const onRequest = defineMiddleware(async (context, next) => {
  if (!hasSupabaseEnv()) return next();

  const supabase = createSupabaseServerClient(context.cookies);
  if (supabase) {
    context.locals.supabase = supabase;
    const { data } = await supabase.auth.getUser();
    context.locals.user = data?.user ?? null;
  }

  return next();
});

