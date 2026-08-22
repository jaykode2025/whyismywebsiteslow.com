-- profiles.email was only ever kept in sync at signup (on_auth_user_created,
-- AFTER INSERT). The new /account "change email" flow
-- (src/pages/api/account/update-email.ts) calls supabase.auth.updateUser({
-- email }), which updates auth.users.email but never touched profiles.email
-- - it would go stale the moment anyone used that feature, which the new
-- admin user list (src/pages/admin/users.astro) reads from directly.
--
-- public.handle_new_user() already upserts on conflict, so it's safe to
-- reuse for updates too.

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_new_user();
