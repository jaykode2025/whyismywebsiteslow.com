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
