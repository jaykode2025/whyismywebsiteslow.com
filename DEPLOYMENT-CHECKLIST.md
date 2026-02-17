# Production Deployment Checklist

## ✅ Pre-Deployment

### 1. Environment Variables (Production)

Set these in **Vercel Project Settings → Environment Variables → Production**:

| Variable | Source | Required |
|----------|--------|----------|
| `SUPABASE_URL` | https://supabase.com/dashboard | ✅ |
| `SUPABASE_ANON_KEY` | Supabase Project Settings → API | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings → API | ✅ |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI or Dashboard | ✅ |
| `STRIPE_PRICE_PRO` | Stripe Product/Price ID ($99/mo) | ✅ |
| `STRIPE_PRICE_AGENCY` | Stripe Product/Price ID ($299/mo) | Optional |
| `STRIPE_PRICE_REPORT_UNLOCK` | Stripe Product/Price ID ($19) | ✅ |
| `QSTASH_TOKEN` | https://console.upstash.com/qstash | ✅ |
| `APP_BASE_URL` | `https://yourdomain.com` | ✅ |
| `PSI_API_KEY` | Google Cloud Console | Optional |

**Helper:** Run `./sync-vercel-envs.sh` to sync Production → Preview + Development

---

### 2. Supabase Setup

```bash
# Apply migrations
npx supabase db push
# OR manually run:
# sql/001_init.sql in Supabase SQL Editor
```

**Verify tables exist:**
- [ ] `profiles`
- [ ] `projects`
- [ ] `scans`
- [ ] `subscriptions`

---

### 3. Stripe Configuration

**Products & Prices to create:**

| Product | Price | Amount | Interval | Price ID |
|---------|-------|--------|----------|----------|
| Pro Plan | $99/mo | 9900 | month | `price_...` |
| Agency Plan | $299/mo | 29900 | month | `price_...` |
| Report Unlock | $19 | 1900 | one-time | `price_...` |

**Helper scripts:**
```bash
# View/create products and prices
./config/stripe/products-and-prices.sh

# Test webhooks locally
./config/stripe/stripe-cli-helper.sh
```

**Webhook Setup:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/billing/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

---

### 4. QStash Setup

1. Create account at https://console.upstash.com
2. Create QStash token
3. Set `APP_BASE_URL` for worker callback: `https://yourdomain.com/api/worker/scan`

---

## 🚀 Deployment Steps

### Step 1: Build & Test Locally

```bash
# Install dependencies
npm install

# Run type check
npx tsc --noEmit

# Build
npm run build

# Preview production build
npm run preview
```

**Test the money path:**
- [ ] Landing page loads (`/`)
- [ ] Scan form submits successfully
- [ ] Report preview shows (locked)
- [ ] Unlock CTA visible
- [ ] Stripe checkout redirects correctly
- [ ] Success page displays after payment

---

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Link project (if not already linked)
vercel link

# Deploy to preview
vercel deploy

# Deploy to production
vercel deploy --prod
```

---

### Step 3: Post-Deployment Verification

**Core Flow:**
- [ ] Homepage loads with CTA
- [ ] URL scan completes (check `/api/scan`)
- [ ] Report page generates (`/report/[id]`)
- [ ] Locked overlay displays correctly
- [ ] Unlock checkout works (`/api/billing/report-checkout`)
- [ ] Subscription checkout works (`/api/billing/checkout`)

**Auth (if using Supabase):**
- [ ] Login works (`/login`)
- [ ] Signup works (`/signup`)
- [ ] Protected routes require auth
- [ ] Logout clears session

**Billing:**
- [ ] Webhook receives events (check Vercel logs)
- [ ] Subscription status updates in DB
- [ ] Unlocked reports accessible after purchase

**SEO Pages:**
- [ ] `/why-is-my-website-slow/` index loads
- [ ] `/why-is-my-website-slow/[slug]` pages generate
- [ ] `/website-speed-audit/[platform]` pages load
- [ ] `/website-speed-audit/[industry]` pages load
- [ ] Sitemap includes all pages (`/sitemap.xml`)

---

### Step 4: Monitoring Setup

**Vercel:**
- [ ] Enable Vercel Analytics
- [ ] Enable Vercel Speed Insights
- [ ] Set up alerts for function errors

**Supabase:**
- [ ] Enable database backups
- [ ] Monitor query performance

**Stripe:**
- [ ] Test webhook delivery
- [ ] Set up billing alerts

---

## 🔧 Troubleshooting

### Scan fails silently
- Check QStash token is valid
- Verify `APP_BASE_URL` is correct
- Check Vercel function logs for errors

### Stripe checkout fails
- Verify price IDs match your Stripe account
- Check webhook secret is correct
- Test with Stripe CLI: `stripe listen --forward-to localhost:4321/api/billing/webhook`

### Supabase auth not working
- Verify `SUPABASE_URL` and keys are correct
- Check RLS policies on tables
- Ensure `profiles` table has trigger for new users

### Rate limiting too aggressive
- Adjust limits in `src/lib/slidingRateLimit.ts`
- Check Redis/QStash connection

---

## 📊 Success Metrics

**Track these post-launch:**
- Scan completion rate
- Report unlock conversion rate
- Subscription conversion rate
- Average scan response time
- Webhook delivery success rate

---

## 🆘 Rollback Plan

If something breaks in production:

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy previous git commit
git revert HEAD
vercel deploy --prod
```

---

**Last updated:** 2026-02-17  
**Version:** 1.0
