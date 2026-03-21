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
