-- ============================================================================
-- whyismywebsiteslow — the 8 migrations missing from the live database
-- Generated 2026-08-28 18:51 UTC
--
-- Paste into the Supabase SQL Editor and Run. This is an alternative to
-- 'supabase db push' for when CLI auth is not available.
--
-- Safe against the current partial schema: none of these files use a bare
-- CREATE TABLE. Three DROP guards were added so the script can be re-run
-- if it fails partway (policies and triggers have no IF NOT EXISTS in PG).
--
-- NOTE: this does NOT record anything in supabase_migrations.schema_migrations.
-- If you later use the CLI, run 'supabase migration repair --status applied'
-- for each of these versions so db push does not try to reapply them.
-- ============================================================================

begin;

-- ─────────────────────────────────────────────────────────────────────────
-- 20260213102000_revenue_hardening.sql
-- ─────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────
-- 20260217120000_add_unique_constraint_projects.sql
-- ─────────────────────────────────────────────────────────────────────────
-- Add unique constraint on projects(user_id, url) for upsert support
-- Required by: src/pages/api/scan.ts:93 (onConflict: 'user_id,url')

alter table "public"."projects" 
  add constraint "projects_user_id_url_key" unique (user_id, url);

-- Add index to support the unique constraint (improves query performance)
create index if not exists "projects_user_id_url_idx" 
  on "public"."projects" (user_id, url);

-- ─────────────────────────────────────────────────────────────────────────
-- 20260218120000_add_growth_analytics.sql
-- ─────────────────────────────────────────────────────────────────────────
alter table if exists public.leads
  add column if not exists offer_context text,
  add column if not exists cta_variant text;

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

alter table public.service_leads enable row level security;
alter table public.events enable row level security;
alter table public.scan_facts enable row level security;

create index if not exists service_leads_created_at_idx on public.service_leads using btree (created_at desc);
create index if not exists service_leads_email_idx on public.service_leads using btree (email);
create index if not exists events_created_at_idx on public.events using btree (created_at desc);
create index if not exists events_event_type_idx on public.events using btree (event_type);
create index if not exists scan_facts_created_at_idx on public.scan_facts using btree (created_at desc);
create index if not exists scan_facts_framework_guess_idx on public.scan_facts using btree (framework_guess);
create index if not exists scan_facts_cms_guess_idx on public.scan_facts using btree (cms_guess);
create index if not exists scan_facts_primary_issue_idx on public.scan_facts using btree (primary_issue);

grant select, insert, update, delete on table public.service_leads to service_role;
grant select, insert, update, delete on table public.events to service_role;
grant select, insert, update, delete on table public.scan_facts to service_role;

revoke all on table public.service_leads from anon;
revoke all on table public.service_leads from authenticated;
revoke all on table public.events from anon;
revoke all on table public.events from authenticated;
revoke all on table public.scan_facts from anon;
revoke all on table public.scan_facts from authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 20260315120000_stripe_webhook_idempotency.sql
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "service_role_all" on public.stripe_webhook_events;
-- Idempotency for Stripe webhooks: skip duplicate events (e.g. retries).
create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is 'Processed Stripe webhook event IDs for idempotency; do not process the same event_id twice.';

-- Only service role needs to write; no RLS needed for server-only use.
alter table public.stripe_webhook_events enable row level security;

create policy "service_role_all"
  on public.stripe_webhook_events
  for all
  to service_role
  using (true)
  with check (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 20260330120000_add_pseo_content_system.sql
-- ─────────────────────────────────────────────────────────────────────────
drop trigger if exists set_scan_insights_updated_at on public.scan_insights;
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.scan_insights (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  industry text not null,
  metric_name text not null,
  metric_value double precision not null,
  sample_size integer not null default 0 check (sample_size >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scan_insights_platform_nonempty check (btrim(platform) <> ''),
  constraint scan_insights_industry_nonempty check (btrim(industry) <> ''),
  constraint scan_insights_metric_name_nonempty check (btrim(metric_name) <> ''),
  constraint scan_insights_platform_industry_metric_key unique (platform, industry, metric_name)
);

create table if not exists public.content_generated (
  id uuid primary key default gen_random_uuid(),
  page_type text not null,
  slug text not null,
  title text not null,
  content text not null,
  data_version integer not null default 1 check (data_version > 0),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  status text not null default 'draft',
  constraint content_generated_slug_key unique (slug),
  constraint content_generated_page_type_check check (
    page_type in ('high_intent', 'platform', 'industry', 'location')
  ),
  constraint content_generated_status_check check (
    status in ('draft', 'published', 'archived')
  ),
  constraint content_generated_slug_nonempty check (btrim(slug) <> ''),
  constraint content_generated_title_nonempty check (btrim(title) <> ''),
  constraint content_generated_status_published_at_check check (
    (status <> 'published') or (published_at is not null)
  )
);

create table if not exists public.content_templates (
  id uuid primary key default gen_random_uuid(),
  page_type text not null,
  template_name text not null,
  template_content text not null,
  variables_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint content_templates_page_type_check check (
    page_type in ('high_intent', 'platform', 'industry', 'location')
  ),
  constraint content_templates_template_name_nonempty check (btrim(template_name) <> ''),
  constraint content_templates_unique_name_per_type unique (page_type, template_name)
);

create table if not exists public.internal_links (
  id uuid primary key default gen_random_uuid(),
  from_slug text not null,
  to_slug text not null,
  anchor_text text not null,
  context text not null,
  created_at timestamptz not null default now(),
  constraint internal_links_from_slug_nonempty check (btrim(from_slug) <> ''),
  constraint internal_links_to_slug_nonempty check (btrim(to_slug) <> ''),
  constraint internal_links_anchor_text_nonempty check (btrim(anchor_text) <> ''),
  constraint internal_links_context_nonempty check (btrim(context) <> ''),
  constraint internal_links_not_self_referential check (from_slug <> to_slug),
  constraint internal_links_unique_edge unique (from_slug, to_slug, anchor_text, context)
);

alter table public.scan_insights enable row level security;
alter table public.content_generated enable row level security;
alter table public.content_templates enable row level security;
alter table public.internal_links enable row level security;

create trigger set_scan_insights_updated_at
  before update on public.scan_insights
  for each row
  execute function public.set_updated_at();

create index if not exists scan_insights_platform_idx
  on public.scan_insights using btree (platform);
create index if not exists scan_insights_industry_idx
  on public.scan_insights using btree (industry);
create index if not exists scan_insights_metric_name_idx
  on public.scan_insights using btree (metric_name);
create index if not exists scan_insights_updated_at_idx
  on public.scan_insights using btree (updated_at desc);

create index if not exists content_generated_page_type_idx
  on public.content_generated using btree (page_type);
create index if not exists content_generated_status_idx
  on public.content_generated using btree (status);
create index if not exists content_generated_published_at_idx
  on public.content_generated using btree (published_at desc);
create index if not exists content_generated_data_version_idx
  on public.content_generated using btree (data_version);

create index if not exists content_templates_page_type_idx
  on public.content_templates using btree (page_type);
create index if not exists content_templates_created_at_idx
  on public.content_templates using btree (created_at desc);

create index if not exists internal_links_from_slug_idx
  on public.internal_links using btree (from_slug);
create index if not exists internal_links_to_slug_idx
  on public.internal_links using btree (to_slug);
create index if not exists internal_links_created_at_idx
  on public.internal_links using btree (created_at desc);

grant select, insert, update, delete on table public.scan_insights to service_role;
grant select, insert, update, delete on table public.content_generated to service_role;
grant select, insert, update, delete on table public.content_templates to service_role;
grant select, insert, update, delete on table public.internal_links to service_role;

revoke all on table public.scan_insights from anon;
revoke all on table public.scan_insights from authenticated;
revoke all on table public.content_generated from anon;
revoke all on table public.content_generated from authenticated;
revoke all on table public.content_templates from anon;
revoke all on table public.content_templates from authenticated;
revoke all on table public.internal_links from anon;
revoke all on table public.internal_links from authenticated;

comment on table public.scan_insights is 'Aggregated scan-derived metrics for pSEO content generation.';
comment on table public.content_generated is 'Generated pSEO pages and their publishing lifecycle.';
comment on table public.content_templates is 'Reusable pSEO templates with variable definitions.';
comment on table public.internal_links is 'Internal link graph between generated pSEO pages.';

-- ─────────────────────────────────────────────────────────────────────────
-- 20260330130000_add_scan_insights_aggregation.sql
-- ─────────────────────────────────────────────────────────────────────────
alter table public.scan_facts
  add column if not exists industry_guess text;

alter table public.scan_facts
  drop constraint if exists scan_facts_industry_guess_check;

alter table public.scan_facts
  add constraint scan_facts_industry_guess_check
  check (
    industry_guess is null
    or industry_guess in ('ecommerce', 'media', 'agency', 'healthcare', 'food', 'general')
  );

create index if not exists scan_facts_industry_guess_idx
  on public.scan_facts using btree (industry_guess);

update public.scan_facts
set industry_guess = case
  when lower(url) like '%shop%' or lower(url) like '%store%' or lower(url) like '%ecommerce%' then 'ecommerce'
  when lower(url) like '%blog%' or lower(url) like '%news%' then 'media'
  when lower(url) like '%agency%' or lower(url) like '%studio%' then 'agency'
  when lower(url) like '%clinic%' or lower(url) like '%dental%' or lower(url) like '%doctor%' then 'healthcare'
  when lower(url) like '%restaurant%' or lower(url) like '%cafe%' then 'food'
  else 'general'
end
where industry_guess is null;

create table if not exists public.cron_log (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint cron_log_status_check check (status in ('success', 'failure', 'started'))
);

alter table public.cron_log enable row level security;

create index if not exists cron_log_job_name_created_at_idx
  on public.cron_log using btree (job_name, created_at desc);

grant select, insert, update, delete on table public.cron_log to service_role;

revoke all on table public.cron_log from anon;
revoke all on table public.cron_log from authenticated;

comment on table public.cron_log is 'Execution log for scheduled and manual cron-style jobs.';

create or replace function public.derive_scan_industry(input_url text)
returns text
language sql
immutable
as $$
  select case
    when input_url is null or btrim(input_url) = '' then 'general'
    when lower(input_url) like '%shop%' or lower(input_url) like '%store%' or lower(input_url) like '%ecommerce%' then 'ecommerce'
    when lower(input_url) like '%blog%' or lower(input_url) like '%news%' then 'media'
    when lower(input_url) like '%agency%' or lower(input_url) like '%studio%' then 'agency'
    when lower(input_url) like '%clinic%' or lower(input_url) like '%dental%' or lower(input_url) like '%doctor%' then 'healthcare'
    when lower(input_url) like '%restaurant%' or lower(input_url) like '%cafe%' then 'food'
    else 'general'
  end
$$;

create or replace function public.aggregate_scan_insights(
  p_start_at timestamptz default (now() - interval '30 days'),
  p_end_at timestamptz default now()
)
returns table (
  platform text,
  industry text,
  metrics_written integer,
  sample_size integer,
  window_start timestamptz,
  window_end timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_at timestamptz := coalesce(p_start_at, now() - interval '30 days');
  v_end_at timestamptz := coalesce(p_end_at, now());
begin
  if v_start_at >= v_end_at then
    raise exception 'aggregate_scan_insights requires start_at < end_at';
  end if;

  return query
  with base as (
    select
      coalesce(
        nullif(lower(sf.cms_guess), ''),
        nullif(lower(sf.framework_guess), ''),
        'unknown'
      ) as platform,
      coalesce(
        nullif(lower(sf.industry_guess), ''),
        public.derive_scan_industry(sf.url),
        'general'
      ) as industry,
      sf.score100,
      sf.lcp_ms,
      sf.fcp_ms,
      sf.cls,
      sf.ttfb_ms,
      sf.total_byte_weight,
      sf.request_count,
      sf.js_kb,
      sf.css_kb,
      sf.image_kb,
      sf.cwv_status,
      sf.cdn_detected
    from public.scan_facts sf
    where sf.created_at >= v_start_at
      and sf.created_at < v_end_at
  ),
  grouped as (
    select
      platform,
      industry,
      count(*)::int as sample_size,
      avg(score100)::double precision as avg_score100,
      avg(lcp_ms)::double precision as avg_lcp_ms,
      avg(fcp_ms)::double precision as avg_fcp_ms,
      avg(cls)::double precision as avg_cls,
      avg(ttfb_ms)::double precision as avg_ttfb_ms,
      avg(total_byte_weight)::double precision as avg_total_byte_weight,
      avg(request_count)::double precision as avg_request_count,
      avg(js_kb)::double precision as avg_js_kb,
      avg(css_kb)::double precision as avg_css_kb,
      avg(image_kb)::double precision as avg_image_kb,
      coalesce(
        avg(case when cwv_status = 'pass' then 1.0 else 0.0 end) * 100.0,
        0
      )::double precision as pass_rate_cwv,
      coalesce(
        avg(case when cdn_detected then 1.0 else 0.0 end) * 100.0,
        0
      )::double precision as cdn_detection_rate
    from base
    group by platform, industry
  ),
  metrics as (
    select platform, industry, sample_size, 'avg_score100'::text as metric_name, avg_score100 as metric_value from grouped
    union all
    select platform, industry, sample_size, 'avg_lcp_ms', avg_lcp_ms from grouped
    union all
    select platform, industry, sample_size, 'avg_fcp_ms', avg_fcp_ms from grouped
    union all
    select platform, industry, sample_size, 'avg_cls', avg_cls from grouped
    union all
    select platform, industry, sample_size, 'avg_ttfb_ms', avg_ttfb_ms from grouped
    union all
    select platform, industry, sample_size, 'avg_total_byte_weight', avg_total_byte_weight from grouped
    union all
    select platform, industry, sample_size, 'avg_request_count', avg_request_count from grouped
    union all
    select platform, industry, sample_size, 'avg_js_kb', avg_js_kb from grouped
    union all
    select platform, industry, sample_size, 'avg_css_kb', avg_css_kb from grouped
    union all
    select platform, industry, sample_size, 'avg_image_kb', avg_image_kb from grouped
    union all
    select platform, industry, sample_size, 'pass_rate_cwv', pass_rate_cwv from grouped
    union all
    select platform, industry, sample_size, 'cdn_detection_rate', cdn_detection_rate from grouped
  ),
  upserted as (
    insert into public.scan_insights (
      platform,
      industry,
      metric_name,
      metric_value,
      sample_size,
      created_at,
      updated_at
    )
    select
      m.platform,
      m.industry,
      m.metric_name,
      m.metric_value,
      m.sample_size,
      now(),
      now()
    from metrics m
    where m.metric_value is not null
    on conflict (platform, industry, metric_name)
    do update
      set metric_value = excluded.metric_value,
          sample_size = excluded.sample_size,
          updated_at = now()
    returning platform, industry, sample_size
  )
  select
    u.platform,
    u.industry,
    count(*)::int as metrics_written,
    max(u.sample_size)::int as sample_size,
    v_start_at as window_start,
    v_end_at as window_end
  from upserted u
  group by u.platform, u.industry
  order by u.platform, u.industry;
end;
$$;

grant execute on function public.aggregate_scan_insights(timestamptz, timestamptz) to service_role;
grant execute on function public.derive_scan_industry(text) to service_role;

comment on function public.aggregate_scan_insights(timestamptz, timestamptz)
is 'Aggregates scan_facts into scan_insights for the provided window, defaulting to the last 30 days.';

-- ─────────────────────────────────────────────────────────────────────────
-- 20260822010000_add_profiles_is_admin.sql
-- ─────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────
-- 20260822010500_sync_profile_email_on_update.sql
-- ─────────────────────────────────────────────────────────────────────────
drop trigger if exists on_auth_user_email_updated on auth.users;
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

commit;
