-- Adds an admin flag for the new /admin dashboard (src/pages/admin/**).
--
-- IMPORTANT: profiles already has a "profiles_update_own" policy allowing a
-- user to update their own row (auth.uid() = id). RLS controls row
-- visibility/writability, not columns - without the column-level REVOKE
-- below, any authenticated user could self-promote via
-- `supabase.from('profiles').update({ is_admin: true })`. This locks that
-- down while leaving the rest of the row (just email/created_at today)
-- updatable as before.

alter table "public"."profiles"
  add column "is_admin" boolean not null default false;

revoke update (is_admin) on "public"."profiles" from anon, authenticated;

-- Bootstrapping the first admin: there's no admin yet to grant the role, so
-- this has to be done once by hand (service role only). Run in the Supabase
-- SQL editor:
--
--   update public.profiles set is_admin = true where email = 'you@example.com';
