import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import { env, hasSupabaseEnv } from "../env";

export function createSupabaseServerClient(cookies: AstroCookies) {
  const url = env.SUPABASE_URL();
  const key = env.SUPABASE_ANON_KEY();
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookies.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        cookies.delete(name, options);
      },
    },
  });
}

export async function getUserFromLocalsOrCookies(locals: App.Locals, cookies: AstroCookies) {
  if (!hasSupabaseEnv()) return { supabase: null, user: null };
  const supabase = locals.supabase ?? createSupabaseServerClient(cookies);
  if (!supabase) return { supabase: null, user: null };
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data?.user ?? null };
}
