import { defineMiddleware } from "astro/middleware";
import { createSupabaseServerClient } from "./lib/supabase/server";
import { hasSupabaseEnv } from "./lib/env";

export const onRequest = defineMiddleware(async (context, next) => {
  if (!hasSupabaseEnv()) return next();

  try {
    const supabase = createSupabaseServerClient(context.cookies, context.request);
    if (supabase) {
      context.locals.supabase = supabase;
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn('Auth error in middleware:', error.message);
      }
      context.locals.user = data?.user ?? null;
    }
  } catch (error: any) {
    console.error('Middleware error:', error.message);
  }

  return next();
});
