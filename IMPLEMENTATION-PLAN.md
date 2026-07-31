# WhyIsMyWebsiteSlow - Complete Feature Implementation Plan

## Current Status ✅

Your project already has solid foundations:
- **Scan Engine**: PSI + enhanced scanner with CrUX data
- **Monetization**: Stripe one-time ($19 report unlock) + subscriptions ($29-300/mo)
- **Analysis**: Performance, SEO, Image audits
- **Lead Capture**: Service leads form for high-ticket work
- **Database**: Supabase with proper RLS and tables

---

## Priority Features to Build Next

### Phase 1: Core Revenue Drivers (Week 1-2)

#### 1. AI Website Auditor Enhancement
**Status**: Partial - you have `scan.enhanced.ts` and `reportIntelligence.ts`

**What to add:**
- [ ] Expand `reportIntelligence.ts` with more specific AI-generated fixes
- [ ] Add "One-click fix" code snippets for common issues
- [ ] Generate prioritized action plans based on revenue impact

**Files to modify:**
- `src/lib/reportIntelligence.ts` - add code snippet generation
- `src/pages/report/[id].astro` - show actionable fixes

---

#### 2. PDF Report Generation
**Status**: Not implemented

**Implementation:**
```bash
npm install puppeteer-core pdf-lib
```

**Create:** `src/lib/pdfReport.ts`
- Generate professional PDF reports
- Include charts, scores, and recommendations
- Brand with WhyIsMyWebsiteSlow logo

**Add to billing:**
- Free: No PDF
- One-time unlock: Basic PDF
- Pro subscription: Branded PDF with white-label option

---

#### 3. Competitor Comparison Tool
**Status**: Not implemented

**Create:** `src/pages/compare/[id].astro`
- Input: Your URL + 2-3 competitor URLs
- Side-by-side performance comparison
- "You're slower than X% of competitors" messaging
- Upsell: "Beat your competitors" CTA

**Database changes:**
```sql
CREATE TABLE competitor_comparisons (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  primary_url text,
  competitor_urls text[],
  comparison_json jsonb,
  created_at timestamptz
);
```

---

### Phase 2: Recurring Revenue (Week 3-4)

#### 4. Weekly Monitoring Dashboard
**Status**: Partial - you have `alerts.ts` and `monitoringSummary.ts`

**Create:** `src/pages/dashboard/`
- `/dashboard` - Overview of all monitored sites
- `/dashboard/projects/[id]` - Single project details
- `/dashboard/alerts` - Alert history

**Features:**
- Core Web Vitals tracking over time
- Score trend charts (use Chart.js you already have)
- Email alerts for regressions
- Uptime monitoring integration

**Database migration:**
```sql
CREATE TABLE monitoring_snapshots (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES projects,
  score integer,
  lcp_ms integer,
  inp_ms integer,
  cls numeric,
  fcp_ms integer,
  ttfb_ms integer,
  cwv_status text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX monitoring_snapshots_project_date 
ON monitoring_snapshots(project_id, created_at DESC);
```

---

#### 5. Email Alert System
**Status**: Partial - you have Resend env vars configured

**Create:** `src/lib/alertEngine.ts`
- Weekly performance summaries
- Regression alerts (score dropped >10 points)
- CWV status change notifications
- Monthly executive summaries

**Supabase Edge Function:**
```typescript
// supabase/functions/send-weekly-alerts/index.ts
- Cron job via QStash
- Fetch all Pro users
- Run scans for their monitored URLs
- Send email if regression detected
```

---

### Phase 3: High-Ticket Services (Week 5-6)

#### 6. "Fix My Site" Service Marketplace
**Status**: Partial - you have `fix-it.astro` and `serviceLeads.ts`

**Enhancements:**
- [ ] Add pricing tiers: $500 (audit), $1500 (fixes), $3000+ (full optimization)
- [ ] Create vendor/application system for freelancers/agencies
- [ ] Build project management dashboard
- [ ] Add milestone tracking and payments

**New pages:**
- `/services` - Service marketplace landing
- `/services/apply` - Freelancer application
- `/services/projects/[id]` - Project dashboard

---

#### 7. White-Label Reports for Agencies
**Status**: Not implemented

**Create:** `src/pages/white-label/`
- Custom branding upload (logo, colors)
- Custom domain support (reports.clientdomain.com)
- Bulk scan/import for agency clients
- Agency dashboard with client management

**Database:**
```sql
CREATE TABLE agency_branding (
  user_id uuid PRIMARY KEY REFERENCES auth.users,
  logo_url text,
  primary_color text,
  secondary_color text,
  custom_domain text,
  company_name text
);
```

---

### Phase 4: Advanced Features (Week 7-8)

#### 8. Broken Link Scanner
**Create:** `src/lib/brokenLinks.ts`
```typescript
export async function scanBrokenLinks(url: string): Promise<BrokenLinkReport> {
  // Crawl site
  // Check all internal/external links
  // Report 404s, redirects, slow responses
}
```

**Add to report:** New section showing broken links with priority

---

#### 9. JavaScript Performance Analyzer
**Create:** `src/lib/jsAudit.ts`
- Parse JS bundle sizes
- Identify unused JavaScript
- Flag render-blocking scripts
- Suggest code splitting opportunities
- Third-party script impact analysis

---

#### 10. Accessibility Checker Enhancement
**Status**: Partial - included in K-score

**Create:** `src/lib/a11yAudit.ts`
- WCAG 2.1 compliance check
- Color contrast analysis
- Alt text validation
- Keyboard navigation testing
- ARIA attribute validation
- Generate accessibility score

---

## Database Migration Script

**File:** `sql/002_add_monitoring_and_features.sql`

```sql
-- Monitoring snapshots
CREATE TABLE IF NOT EXISTS monitoring_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scan_id text REFERENCES scans(id),
  score integer NOT NULL,
  lcp_ms integer,
  inp_ms integer,
  cls numeric(8,4),
  fcp_ms integer,
  ttfb_ms integer,
  cwv_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitoring_snapshots_project_idx ON monitoring_snapshots(project_id);
CREATE INDEX IF NOT EXISTS monitoring_snapshots_created_at_idx ON monitoring_snapshots(created_at DESC);

-- Competitor comparisons
CREATE TABLE IF NOT EXISTS competitor_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_url text NOT NULL,
  competitor_urls text[] NOT NULL,
  comparison_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Agency branding
CREATE TABLE IF NOT EXISTS agency_branding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text,
  secondary_color text,
  custom_domain text,
  company_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Monitoring settings per project
CREATE TABLE IF NOT EXISTS monitoring_settings (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  frequency_hours integer NOT NULL DEFAULT 168, -- weekly
  alert_email text,
  slack_webhook text,
  notify_on_regression boolean NOT NULL DEFAULT true,
  regression_threshold integer NOT NULL DEFAULT 10
);

-- RLS Policies
ALTER TABLE monitoring_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_settings ENABLE ROW LEVEL SECURITY;

-- Monitoring snapshots policies
CREATE POLICY "monitoring_snapshots_select_own"
ON monitoring_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = monitoring_snapshots.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "monitoring_snapshots_insert_own"
ON monitoring_snapshots FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = monitoring_snapshots.project_id 
    AND p.user_id = auth.uid()
  )
);

-- Competitor comparisons policies
CREATE POLICY "competitor_comparisons_select_own"
ON competitor_comparisons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "competitor_comparisons_insert_own"
ON competitor_comparisons FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Agency branding policies
CREATE POLICY "agency_branding_select_own"
ON agency_branding FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "agency_branding_upsert_own"
ON agency_branding FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Monitoring settings policies
CREATE POLICY "monitoring_settings_select_own"
ON monitoring_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = monitoring_settings.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "monitoring_settings_upsert_own"
ON monitoring_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = monitoring_settings.project_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = monitoring_settings.project_id 
    AND p.user_id = auth.uid()
  )
);
```

---

## Revenue Model Projection

### Pricing Tiers

| Tier | Price | Target | Features |
|------|-------|--------|----------|
| **Free** | $0 | Lead gen | Basic scan, score, locked fixes |
| **Report Unlock** | $19 | One-time | Full report, PDF, code snippets |
| **Pro** | $29/mo | SMBs | Monitoring, alerts, exports, AI recs |
| **Business** | $99/mo | Growing | 10 sites, competitor tracking, white-label lite |
| **Agency** | $299/mo | Agencies | Unlimited sites, full white-label, API access |
| **Done-For-You** | $500-2000 | High-ticket | Manual optimization service |

### Path to $10k-20k/month

**Scenario A: Subscription-focused**
- 150 Pro customers × $29 = $4,350
- 50 Business customers × $99 = $4,950
- 10 Agency customers × $299 = $2,990
- **Total: $12,290/month**

**Scenario B: Mixed revenue**
- 100 Pro customers × $29 = $2,900
- 30 Business customers × $99 = $2,970
- 5 Agency customers × $299 = $1,495
- 20 Report unlocks/week × $19 × 4 = $1,520
- 4 DFY projects/month × $1,500 avg = $6,000
- **Total: $14,885/month**

---

## Implementation Order

### Week 1: Foundation
1. Set up PDF generation
2. Enhance AI recommendations with code snippets
3. Create monitoring database schema

### Week 2: Monitoring MVP
1. Build dashboard UI
2. Implement weekly scan automation
3. Set up email alerts

### Week 3: Competitive Intelligence
1. Build competitor comparison tool
2. Add to Pro/Business tiers
3. Create marketing landing page

### Week 4: Agency Features
1. White-label branding
2. Bulk client import
3. Agency dashboard

### Week 5-6: Service Marketplace
1. Enhanced service lead forms
2. Vendor application system
3. Project management tools

### Week 7-8: Advanced Audits
1. Broken link scanner
2. JS performance analyzer
3. Enhanced accessibility checker

---

## Marketing & Growth Tactics

### Content Marketing
- Industry-specific landing pages (already started with `/website-speed-audit/industry/`)
- "Why is [Platform] slow?" articles (Shopify, WordPress, Wix)
- Case studies with before/after metrics

### SEO Strategy
- Target long-tail: "why is my Shopify store slow"
- Programmatic SEO: City + "website speed test"
- Tool pages: free image optimizer, meta tag generator

### Partnerships
- Hosting companies (referral commissions)
- WordPress/Shopify agencies (white-label resellers)
- Marketing agencies (add-on service)

### Product Hunt Launch
- Prepare for relaunch with full monitoring suite
- Offer lifetime deals for early adopters
- Collect testimonials during beta

---

## Technical Debt & Optimizations

### Immediate
- [ ] Add rate limiting to API endpoints
- [ ] Implement caching for repeated scans
- [ ] Add error tracking (Sentry)

### Short-term
- [ ] Optimize Playwright scans for serverless
- [ ] Add Redis for session/rate limit storage
- [ ] Implement webhook retry logic

### Long-term
- [ ] Multi-region scan workers
- [ ] Real-user monitoring (RUM) integration
- [ ] Machine learning for issue prediction

---

## Success Metrics

### Weekly KPIs
- Scans completed
- Report unlocks purchased
- Subscription conversions
- Service lead submissions
- MRR growth

### Monthly KPIs
- Churn rate
- Customer lifetime value (LTV)
- Net promoter score (NPS)
- Feature adoption rates

---

## Next Actions

1. **Today**: Review this plan and prioritize features
2. **This week**: Start with PDF generation + monitoring schema
3. **Next week**: Build dashboard UI and alert system
4. **Month 1**: Launch Pro tier with monitoring
5. **Month 2**: Add agency features and service marketplace

---

**Remember**: You don't need to build everything at once. Focus on the features that directly drive revenue first (PDF reports, monitoring, service leads), then expand.

The foundation is solid. Now it's about execution and iteration.
