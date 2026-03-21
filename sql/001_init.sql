-- whyismywebsiteslow SaaS schema (Supabase Postgres)
-- Apply via Supabase SQL editor or migrations.

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles: one row per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- Projects: saved sites per user
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  name text,
  created_at timestamptz not null default now()
);

-- Scans: scan history + report payloads
create table if not exists public.scans (
  id text primary key,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  url text not null,
  status text not null check (status in ('queued','running','done','failed')),
  device text not null check (device in ('mobile','desktop')),
  visibility text not null check (visibility in ('unlisted','public')),
  crawl_enabled boolean not null default false,
  crawl_max_links int not null default 1,
  manage_token_hash text,
  summary_json jsonb,
  report_json jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists scans_user_id_idx on public.scans(user_id);
create index if not exists scans_project_id_idx on public.scans(project_id);
create index if not exists scans_created_at_idx on public.scans(created_at desc);
create index if not exists scans_visibility_idx on public.scans(visibility);

-- Report entitlements: one-time unlocks
create table if not exists public.report_entitlements (
  report_id text primary key,
  unlocked boolean not null default false,
  stripe_session_id text,
  created_at timestamptz not null default now()
);

-- Subscriptions: current plan per user
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  price_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  report_id text,
  source text not null default 'preview',
  offer_context text,
  cta_variant text,
  user_agent text,
  referer text,
  report_url text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.service_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  website_url text,
  report_id text,
  notes text,
  source text not null default 'service',
  offer_context text,
  cta_variant text,
  user_agent text,
  referer text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  scan_id text,
  report_id text,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  source text,
  cta_variant text,
  offer_context text,
  referrer text,
  user_agent text,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.scan_facts (
  scan_id text primary key references public.scans(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  canonical_host text not null,
  url text not null,
  device text not null,
  visibility text not null,
  score100 int not null,
  grade text not null,
  cwv_status text not null,
  lcp_ms int,
  inp_ms int,
  cls numeric(8,4),
  fcp_ms int,
  ttfb_ms int,
  total_byte_weight bigint,
  html_kb int,
  js_kb int,
  css_kb int,
  image_kb int,
  request_count int,
  primary_issue text,
  secondary_issues text[] not null default '{}',
  top_issue_categories text[] not null default '{}',
  framework_guess text,
  cms_guess text,
  hosting_guess text,
  cdn_detected boolean not null default false,
  lead_source text,
  unlock_status text not null default 'locked',
  subscription_status text,
  service_lead_status text not null default 'none'
);

-- Optional stubs for future multi-page audits
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.page_audits (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  scan_id text references public.scans(id) on delete cascade,
  report_json jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.scans enable row level security;
alter table public.report_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.leads enable row level security;
alter table public.service_leads enable row level security;
alter table public.events enable row level security;
alter table public.scan_facts enable row level security;
alter table public.pages enable row level security;
alter table public.page_audits enable row level security;

-- Profiles policies
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Projects policies
create policy "projects_select_own"
on public.projects for select
using (auth.uid() = user_id);

create policy "projects_insert_own"
on public.projects for insert
with check (auth.uid() = user_id);

create policy "projects_update_own"
on public.projects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "projects_delete_own"
on public.projects for delete
using (auth.uid() = user_id);

-- Scans policies
-- Public scans can be viewed by anyone when done.
create policy "scans_select_public_done"
on public.scans for select
using (visibility = 'public' and status = 'done');

-- Unlisted scans can be viewed by anyone with the link when done.
create policy "scans_select_unlisted_done"
on public.scans for select
using (visibility = 'unlisted' and status = 'done');

-- Allow polling status for public/unlisted scans (needed for report progress UI).
create policy "scans_select_public_or_unlisted_any_status"
on public.scans for select
using (visibility in ('public','unlisted'));

-- Owners can view their scans.
create policy "scans_select_own"
on public.scans for select
using (auth.uid() = user_id);

-- Owners can insert scans for themselves.
create policy "scans_insert_own"
on public.scans for insert
with check (auth.uid() = user_id);

-- Allow anonymous scans (user_id null).
create policy "scans_insert_anon"
on public.scans for insert
with check (user_id is null);

-- Owners can delete their scans.
create policy "scans_delete_own"
on public.scans for delete
using (auth.uid() = user_id);

-- Report entitlements policies
create policy "report_entitlements_select_all"
on public.report_entitlements for select
using (true);

-- Subscriptions policies
create policy "subs_select_own"
on public.subscriptions for select
using (auth.uid() = user_id);

create index if not exists leads_created_at_idx on public.leads using btree (created_at desc);
create index if not exists leads_email_idx on public.leads using btree (email);
create index if not exists service_leads_created_at_idx on public.service_leads using btree (created_at desc);
create index if not exists service_leads_email_idx on public.service_leads using btree (email);
create index if not exists events_created_at_idx on public.events using btree (created_at desc);
create index if not exists events_event_type_idx on public.events using btree (event_type);
create index if not exists scan_facts_created_at_idx on public.scan_facts using btree (created_at desc);
create index if not exists scan_facts_framework_guess_idx on public.scan_facts using btree (framework_guess);
create index if not exists scan_facts_cms_guess_idx on public.scan_facts using btree (cms_guess);
create index if not exists scan_facts_primary_issue_idx on public.scan_facts using btree (primary_issue);

grant select, insert, update, delete on table public.leads to service_role;
grant select, insert, update, delete on table public.service_leads to service_role;
grant select, insert, update, delete on table public.events to service_role;
grant select, insert, update, delete on table public.scan_facts to service_role;

revoke all on table public.leads from anon;
revoke all on table public.leads from authenticated;
revoke all on table public.service_leads from anon;
revoke all on table public.service_leads from authenticated;
revoke all on table public.events from anon;
revoke all on table public.events from authenticated;
revoke all on table public.scan_facts from anon;
revoke all on table public.scan_facts from authenticated;

-- Pages policies (stubs)
create policy "pages_select_own"
on public.pages for select
using (
  exists (
    select 1 from public.projects p
    where p.id = pages.project_id and p.user_id = auth.uid()
  )
);

create policy "pages_insert_own"
on public.pages for insert
with check (
  exists (
    select 1 from public.projects p
    where p.id = pages.project_id and p.user_id = auth.uid()
  )
);

create policy "page_audits_select_own"
on public.page_audits for select
using (
  exists (
    select 1
    from public.pages pg
    join public.projects p on p.id = pg.project_id
    where pg.id = page_audits.page_id and p.user_id = auth.uid()
  )
);

-- Helpful trigger: keep profiles in sync on signup (optional; safe if already exists)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'inactive')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
