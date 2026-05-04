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
