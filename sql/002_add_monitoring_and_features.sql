-- WhyIsMyWebsiteSlow - Monitoring & Advanced Features Migration
-- Apply via Supabase SQL editor or migrations
-- Run after 001_init.sql

-- ============================================
-- MONITORING SNAPSHOTS
-- Track performance over time for Pro users
-- ============================================

CREATE TABLE IF NOT EXISTS public.monitoring_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scan_id text REFERENCES scans(id) ON DELETE SET NULL,
  score integer NOT NULL,
  lcp_ms integer,
  inp_ms integer,
  cls numeric(8,4),
  fcp_ms integer,
  ttfb_ms integer,
  cwv_status text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitoring_snapshots_project_idx ON monitoring_snapshots(project_id);
CREATE INDEX IF NOT EXISTS monitoring_snapshots_created_at_idx ON monitoring_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_snapshots_project_date_idx ON monitoring_snapshots(project_id, created_at DESC);

-- ============================================
-- COMPETITOR COMPARISONS
-- Allow users to compare against competitors
-- ============================================

CREATE TABLE IF NOT EXISTS public.competitor_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_url text NOT NULL,
  competitor_urls text[] NOT NULL,
  comparison_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS competitor_comparisons_user_idx ON competitor_comparisons(user_id);
CREATE INDEX IF NOT EXISTS competitor_comparisons_created_at_idx ON competitor_comparisons(created_at DESC);

-- ============================================
-- AGENCY BRANDING
-- White-label configuration for agencies
-- ============================================

CREATE TABLE IF NOT EXISTS public.agency_branding (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#3B82F6',
  secondary_color text NOT NULL DEFAULT '#1E40AF',
  custom_domain text,
  company_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_branding_user_idx ON agency_branding(user_id);

-- ============================================
-- MONITORING SETTINGS
-- Per-project monitoring configuration
-- ============================================

CREATE TABLE IF NOT EXISTS public.monitoring_settings (
  project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  frequency_hours integer NOT NULL DEFAULT 168, -- weekly (7 days)
  alert_email text,
  slack_webhook text,
  notify_on_regression boolean NOT NULL DEFAULT true,
  regression_threshold integer NOT NULL DEFAULT 10, -- percentage drop
  notify_on_cwv_change boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS monitoring_settings_enabled_idx ON monitoring_settings(enabled) WHERE enabled = true;

-- ============================================
-- BROKEN LINKS AUDIT
-- Store broken link scan results
-- ============================================

CREATE TABLE IF NOT EXISTS public.broken_links_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  scan_id text REFERENCES scans(id) ON DELETE SET NULL,
  total_links integer NOT NULL DEFAULT 0,
  broken_links integer NOT NULL DEFAULT 0,
  redirected_links integer NOT NULL DEFAULT 0,
  links_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS broken_links_audits_project_idx ON broken_links_audits(project_id);
CREATE INDEX IF NOT EXISTS broken_links_audits_created_at_idx ON broken_links_audits(created_at DESC);

-- ============================================
-- JS AUDIT RESULTS
-- JavaScript performance analysis
-- ============================================

CREATE TABLE IF NOT EXISTS public.js_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  scan_id text REFERENCES scans(id) ON DELETE SET NULL,
  total_js_kb numeric(10,2),
  unused_js_kb numeric(10,2),
  blocking_scripts integer,
  third_party_scripts integer,
  recommendations text[],
  audit_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS js_audits_project_idx ON js_audits(project_id);
CREATE INDEX IF NOT EXISTS js_audits_created_at_idx ON js_audits(created_at DESC);

-- ============================================
-- ACCESSIBILITY AUDITS
-- WCAG compliance tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.accessibility_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  scan_id text REFERENCES scans(id) ON DELETE SET NULL,
  wcag_level text NOT NULL DEFAULT 'AA',
  score integer NOT NULL,
  violations integer NOT NULL DEFAULT 0,
  warnings integer NOT NULL DEFAULT 0,
  passes integer NOT NULL DEFAULT 0,
  issues_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS accessibility_audits_project_idx ON accessibility_audits(project_id);
CREATE INDEX IF NOT EXISTS accessibility_audits_created_at_idx ON accessibility_audits(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.monitoring_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broken_links_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.js_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_audits ENABLE ROW LEVEL SECURITY;

-- Monitoring snapshots policies
CREATE POLICY IF NOT EXISTS "monitoring_snapshots_select_own"
ON public.monitoring_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = monitoring_snapshots.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "monitoring_snapshots_insert_own"
ON public.monitoring_snapshots FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = monitoring_snapshots.project_id 
    AND p.user_id = auth.uid()
  )
);

-- Competitor comparisons policies
CREATE POLICY IF NOT EXISTS "competitor_comparisons_select_own"
ON public.competitor_comparisons FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "competitor_comparisons_insert_own"
ON public.competitor_comparisons FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "competitor_comparisons_delete_own"
ON public.competitor_comparisons FOR DELETE
USING (auth.uid() = user_id);

-- Agency branding policies
CREATE POLICY IF NOT EXISTS "agency_branding_select_own"
ON public.agency_branding FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "agency_branding_upsert_own"
ON public.agency_branding FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Monitoring settings policies
CREATE POLICY IF NOT EXISTS "monitoring_settings_select_own"
ON public.monitoring_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = monitoring_settings.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "monitoring_settings_upsert_own"
ON public.monitoring_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = monitoring_settings.project_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = monitoring_settings.project_id 
    AND p.user_id = auth.uid()
  )
);

-- Broken links audits policies
CREATE POLICY IF NOT EXISTS "broken_links_audits_select_own"
ON public.broken_links_audits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = broken_links_audits.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "broken_links_audits_insert_own"
ON public.broken_links_audits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = broken_links_audits.project_id 
    AND p.user_id = auth.uid()
  )
);

-- JS audits policies
CREATE POLICY IF NOT EXISTS "js_audits_select_own"
ON public.js_audits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = js_audits.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "js_audits_insert_own"
ON public.js_audits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = js_audits.project_id 
    AND p.user_id = auth.uid()
  )
);

-- Accessibility audits policies
CREATE POLICY IF NOT EXISTS "accessibility_audits_select_own"
ON public.accessibility_audits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = accessibility_audits.project_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "accessibility_audits_insert_own"
ON public.accessibility_audits FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = accessibility_audits.project_id 
    AND p.user_id = auth.uid()
  )
);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get monitoring stats for a project
CREATE OR REPLACE FUNCTION public.get_monitoring_stats(p_project_id uuid)
RETURNS TABLE (
  latest_score integer,
  avg_score numeric,
  score_trend numeric,
  latest_cwv_status text,
  total_scans bigint,
  last_scan_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT score FROM monitoring_snapshots WHERE project_id = p_project_id ORDER BY created_at DESC LIMIT 1) as latest_score,
    (SELECT AVG(score) FROM monitoring_snapshots WHERE project_id = p_project_id AND created_at > NOW() - INTERVAL '30 days') as avg_score,
    (
      SELECT 
        CASE 
          WHEN COUNT(*) < 2 THEN 0
          ELSE (
            (SELECT score FROM monitoring_snapshots WHERE project_id = p_project_id ORDER BY created_at DESC LIMIT 1) -
            (SELECT score FROM monitoring_snapshots WHERE project_id = p_project_id ORDER BY created_at ASC LIMIT 1)
          ) / (COUNT(*) - 1)
        END
      FROM monitoring_snapshots 
      WHERE project_id = p_project_id 
      AND created_at > NOW() - INTERVAL '7 days'
    ) as score_trend,
    (SELECT cwv_status FROM monitoring_snapshots WHERE project_id = p_project_id ORDER BY created_at DESC LIMIT 1) as latest_cwv_status,
    (SELECT COUNT(*) FROM monitoring_snapshots WHERE project_id = p_project_id) as total_scans,
    (SELECT MAX(created_at) FROM monitoring_snapshots WHERE project_id = p_project_id) as last_scan_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user has active monitoring
CREATE OR REPLACE FUNCTION public.has_active_monitoring(p_user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.monitoring_settings ms
    JOIN public.projects p ON p.id = ms.project_id
    WHERE p.user_id = p_user_id
    AND ms.enabled = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions to service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitoring_snapshots TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.competitor_comparisons TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.agency_branding TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.monitoring_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.broken_links_audits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.js_audits TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accessibility_audits TO service_role;

-- Revoke from anon/authenticated
REVOKE ALL ON TABLE public.monitoring_snapshots FROM anon;
REVOKE ALL ON TABLE public.monitoring_snapshots FROM authenticated;
REVOKE ALL ON TABLE public.competitor_comparisons FROM anon;
REVOKE ALL ON TABLE public.competitor_comparisons FROM authenticated;
REVOKE ALL ON TABLE public.agency_branding FROM anon;
REVOKE ALL ON TABLE public.agency_branding FROM authenticated;
REVOKE ALL ON TABLE public.monitoring_settings FROM anon;
REVOKE ALL ON TABLE public.monitoring_settings FROM authenticated;
REVOKE ALL ON TABLE public.broken_links_audits FROM anon;
REVOKE ALL ON TABLE public.broken_links_audits FROM authenticated;
REVOKE ALL ON TABLE public.js_audits FROM anon;
REVOKE ALL ON TABLE public.js_audits FROM authenticated;
REVOKE ALL ON TABLE public.accessibility_audits FROM anon;
REVOKE ALL ON TABLE public.accessibility_audits FROM authenticated;

COMMENT ON TABLE public.monitoring_snapshots IS 'Time-series performance data for monitored projects';
COMMENT ON TABLE public.competitor_comparisons IS 'Competitive analysis comparing user site vs competitors';
COMMENT ON TABLE public.agency_branding IS 'White-label branding configuration for agency accounts';
COMMENT ON TABLE public.monitoring_settings IS 'Per-project monitoring configuration and alert preferences';
COMMENT ON TABLE public.broken_links_audits IS 'Broken link scan results and history';
COMMENT ON TABLE public.js_audits IS 'JavaScript performance audit results';
COMMENT ON TABLE public.accessibility_audits IS 'WCAG accessibility compliance audits';
