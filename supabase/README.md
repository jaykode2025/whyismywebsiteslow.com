# Supabase schema and migrations

## Source of truth

- **Migrations** in `supabase/migrations/` are the source of truth. Apply them in order with `npx supabase db push` (or run each `.sql` in the Supabase SQL editor).
- **`supabase/schemas/001_init.sql`** is a convenience snapshot for reference and local setup; it is not automatically applied. For production, always use migrations so history is preserved.

## Applying changes

1. Add a new file under `supabase/migrations/` with a timestamp prefix, e.g. `20260315120000_description.sql`.
2. Run `npx supabase db push` to apply pending migrations to your linked project.

## Key tables

- `profiles` – user profile data
- `projects` – saved site URLs per user
- `scans` – scan jobs and report payloads
- `subscriptions` – Stripe subscription state per user
- `report_entitlements` – one-time report unlock state
- `stripe_webhook_events` – idempotency for Stripe webhooks (do not process same event twice)
