-- Affiliate/referral program: a founder-managed code per partner, plus a
-- ledger of Stripe conversions attributed to that code so commission owed
-- is queryable instead of tracked by hand.
create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  email text,
  commission_pct numeric not null default 20 check (commission_pct >= 0 and commission_pct <= 100),
  status text not null default 'active' check (status in ('active', 'paused')),
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.affiliates is 'Referral partners. Created by an admin (see /admin/affiliates) - no public self-serve signup yet.';
comment on column public.affiliates.code is 'Value passed as ?ref=<code> on any page; captured first-touch into a cookie by middleware.ts.';

create table if not exists public.affiliate_referrals (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates(id) on delete cascade,
  stripe_session_id text not null unique,
  kind text not null check (kind in ('subscription', 'report_unlock')),
  amount_cents integer not null,
  currency text not null default 'usd',
  commission_cents integer not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

comment on table public.affiliate_referrals is 'One row per Stripe checkout session attributed to an affiliate code (see src/lib/affiliates.ts). Unique on stripe_session_id so a retried webhook cannot double-count.';

create index if not exists affiliate_referrals_affiliate_id_idx on public.affiliate_referrals (affiliate_id);

-- Server-only data (created/read via the service-role admin client from
-- /admin/affiliates and the Stripe webhook) - no anon/authenticated access.
alter table public.affiliates enable row level security;
alter table public.affiliate_referrals enable row level security;

create policy "service_role_all" on public.affiliates
  for all to service_role using (true) with check (true);

create policy "service_role_all" on public.affiliate_referrals
  for all to service_role using (true) with check (true);
