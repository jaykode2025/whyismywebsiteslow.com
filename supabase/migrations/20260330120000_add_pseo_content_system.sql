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
