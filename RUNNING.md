# How to run this project

## Quick start (dev server only)

```bash
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:4321**. With an **empty or minimal `.env`**:

- **Homepage and scan form** work.
- **Scans run synchronously** and reports are stored in `.data/reports.json` (file store). No Supabase or QStash required.
- **Auth (login/signup)** and **billing** will not work until you add the right env vars.

So you can run and test the UI and scan flow without any external services.

---

## What you need for each feature

| Feature | Required env | Notes |
|--------|----------------|------|
| **Dev server** | None | `npm run dev` works with empty `.env`. |
| **Scans (sync, local)** | None | Uses file store (`.data/reports.json`). |
| **Scans (queue + DB)** | `SUPABASE_*`, `QSTASH_TOKEN`, `APP_BASE_URL` | Scans go to QStash worker and results go to Supabase. |
| **Auth (login/signup)** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Plus `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` if you use client-side Supabase. |
| **Billing (Stripe)** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `APP_BASE_URL` | Webhook and checkout need these. |
| **Report unlock** | Stripe + `STRIPE_PRICE_REPORT_UNLOCK` | One-time purchase. |
| **Higher PSI rate limits** | `PSI_API_KEY` (optional) | From Google Cloud Console. |

---

## Full local setup (all features)

1. **Copy env**
   ```bash
   cp .env.example .env
   ```

2. **Supabase**  
   Create a project at [supabase.com](https://supabase.com). In `.env` set:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PUBLIC_SUPABASE_URL` = same as `SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY` = same as `SUPABASE_ANON_KEY`

3. **Apply DB schema**
   ```bash
   npx supabase db push
   ```
   Or run the SQL in `supabase/migrations/` (in order) in the Supabase SQL editor.

4. **Stripe**  
   Create products/prices in [Stripe Dashboard](https://dashboard.stripe.com). Set in `.env`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET` (use Stripe CLI for local: `stripe listen --forward-to localhost:4321/api/billing/webhook`)
   - `STRIPE_PRICE_PRO`, `STRIPE_PRICE_REPORT_UNLOCK`, etc.

5. **QStash** (for background scans)  
   Get a token from [Upstash QStash](https://console.upstash.com/qstash). Set:
   - `QSTASH_TOKEN`
   - `APP_BASE_URL=http://localhost:4321` (for local worker URL; production uses your real URL).

6. **Run**
   ```bash
   npm run dev
   ```

---

## Build & typecheck

```bash
npm install
npx tsc --noEmit   # type check
npm run build      # production build
npm run preview    # preview production build locally
```

Build does not require env vars to succeed; pages that call APIs will fail at runtime if the right env is missing.

---

## Updating the live site

The **online** site (whyismywebsiteslow.com) only changes when you deploy. Edits in this repo do not affect the live site until a new build is deployed.

**Option A – Vercel connected to Git (recommended)**  
Push to your production branch (e.g. `main`). Vercel will build and deploy automatically. Your improvements (and any AI-made edits in the repo) go live after the deploy finishes.

**Option B – Deploy from your machine**  
```bash
npm run build
vercel deploy --prod
```

**AI workflow:** You do everything with AI in the terminal. The AI can check the live site, edit the repo, and run build + deploy (`npm run build` then `vercel deploy --prod`, or `git push`) so the live site updates. See [AGENTS.md](./AGENTS.md).

---

## Checklist: “Do I have everything?”

- [ ] `.env` exists (from `.env.example`).
- [ ] For **scans only**: nothing else required (file store is used).
- [ ] For **auth**: Supabase keys set and migrations applied.
- [ ] For **queued scans**: Supabase + `QSTASH_TOKEN` + `APP_BASE_URL`.
- [ ] For **billing**: Stripe keys and price IDs; webhook secret; for local, Stripe CLI forwarding to `/api/billing/webhook`.
- [ ] For **report unlock**: Stripe + `STRIPE_PRICE_REPORT_UNLOCK`.
