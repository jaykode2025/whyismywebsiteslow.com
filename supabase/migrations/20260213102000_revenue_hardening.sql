-- Tighten direct table access so locked report data cannot be read from client-side Supabase queries.
revoke select on table public.scans from anon;
revoke select on table public.scans from authenticated;
revoke select on table public.report_entitlements from anon;
revoke select on table public.report_entitlements from authenticated;

drop policy if exists scans_select_public_done on public.scans;
drop policy if exists scans_select_public_or_unlisted_any_status on public.scans;
drop policy if exists scans_select_unlisted_done on public.scans;
drop policy if exists report_entitlements_select_all on public.report_entitlements;

-- Durable lead storage for preview capture.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  report_id text,
  source text not null default 'preview',
  user_agent text,
  referer text,
  report_url text,
  created_at timestamp with time zone not null default now()
);

alter table public.leads enable row level security;

create index if not exists leads_created_at_idx on public.leads using btree (created_at desc);
create index if not exists leads_email_idx on public.leads using btree (email);

grant select, insert, update, delete on table public.leads to service_role;
revoke all on table public.leads from anon;
revoke all on table public.leads from authenticated;
