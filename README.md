# whyismywebsiteslow 🐱🎩

Performance report generator built with Astro, Svelte, and Tailwind. Paste a URL, run a scan, and share a premium report with Core Web Vitals-style scoring and prioritized fixes.

## 🎯 The "Money Path" (Production Flow)

This project is optimized for a high-conversion SaaS flow:
1. **Landing** → User enters URL for an instant scan.
2. **Scan** → Uses Google PageSpeed Insights (PSI) for reliable, serverless-safe metrics.
3. **Report Preview** → Shows high-level score and grade, but locks detailed fixes.
4. **Unlock ($19)** → One-time payment to unlock the full report and prioritized checklist.
5. **Upsell ($99/mo)** → Recurring subscription for 24/7 monitoring and alerts.

## 🚀 Features

- **Reliable Scan Engine**: Powered by PSI/Lighthouse API (no Playwright headaches in production).
- **Locked Report UX**: Built-in monetization with Stripe integration.
- **K-Score System**: Proprietary scoring that combines performance, SEO, and image health.
- **SEO Analysis**: Automatic content health audit for target keywords.
- **Image Audit**: Identifies overweight images and potential savings.
- **Durable Workers**: Uses QStash for reliable background processing.

## 🛠 Tech Stack

- **Astro**: Static-first, SEO optimized.
- **Svelte 5**: Modern reactivity for the scan UI and report filters.
- **Tailwind CSS**: Utility-first styling.
- **Supabase**: Auth, Database, and Edge functions.
- **Stripe**: One-time and recurring payments.
- **QStash**: Durable task queue for scans.

## 💻 Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

**See [RUNNING.md](./RUNNING.md)** for what env you need for each feature (scan-only works with no keys; auth + billing need Supabase + Stripe).

### Environment Configuration

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for admin operations |
| `STRIPE_SECRET_KEY` | Your Stripe secret key |
| `STRIPE_PRICE_PRO` | Stripe Price ID for the $99/mo plan |
| `QSTASH_TOKEN` | Upstash QStash token for background jobs |
| `APP_BASE_URL` | Your production URL (e.g., https://yourdomain.com) |

## 🏗 Architecture Notes

- **Scan Pipeline**: `src/lib/scan.enhanced.ts` is the main entry point. It coordinates PSI, SEO, and Image audits.
- **Playwright**: The Playwright engine (`src/lib/playwrightScan.ts`) is **disabled by default** to ensure stability on serverless platforms like Vercel. It is kept in the codebase for future advanced worker use.
- **Monetization**: Report locking is handled in `src/pages/report/[id].astro` using the `isReportUnlocked` helper.

## 📄 License

MIT
