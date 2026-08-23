# Enhanced Scanner

How `src/lib/scanner/enhanced.ts` measures a site, and how it fits into the rest of the scan
pipeline. (Previously this file was a stale copy-paste of an old version of that source file
from before it was refactored to use `fetchWithRetry` - this is a rewrite reflecting the actual
current implementation. See `PROJECT_AUDIT.md` for the full architecture.)

## What it combines

Three data sources, fetched in parallel:

1. **CrUX (Chrome UX Report)** - real-user field data for the site's origin, pulled from
   Google's public CrUX API. This is the closest thing to "how does this actually perform for
   real visitors," and is weighted higher than lab data in the final score.
2. **PSI / Lighthouse** - lab data from Google's hosted PageSpeed Insights API (category
   scores plus detailed Core Web Vitals audits). No browser is run locally or in this app's
   own infrastructure - Playwright (`src/lib/playwrightScan.ts`) is an intentional no-op stub,
   disabled for serverless stability (see `.env.example`). All "lab" data comes from Google's
   hosted API, not from a browser this app controls.
3. **Manual network checks** - a lightweight `fetchWithRetry`-based timing measurement (TTFB,
   redirect count) run directly against the target URL.

All outbound fetches (CrUX, PSI, and the manual network check) go through
`src/lib/retry.ts`'s `fetchWithRetry`, which as of this session's security pass re-validates
every redirect hop against the SSRF blocklist (`src/lib/validate.ts`) rather than following
redirects unconditionally.

## Scoring

CrUX and PSI results are blended into a single 0-100 score with CrUX weighted higher when both
are available (real-user data is trusted more than a single lab run). `confidence` reflects
CrUX's own sample-size bucket (`high`/`medium`/`low`) when CrUX data is available, falling back
to `medium`/`low` based on whether lab data alone was available. See
`calculateOverallScore`/`getGrade` in `src/lib/scanner/enhanced.ts` for the exact weighting.

## Where this fits in the pipeline

`runEnhancedScanner()` (this file) is called by `runEnhancedScan()` in
`src/lib/scan.enhanced.ts`, which is the one live scan path used by both `POST /api/scan`
(synchronous fallback, no Supabase/QStash configured) and `POST /api/worker/scan` (the
QStash-queued path). `src/lib/scan.ts` (an older, simpler scan implementation) and
`src/lib/psi.ts` (a standalone PSI client with its own duplicate parsing logic) were both
confirmed dead code with zero call sites and removed as part of the code-cleanup pass.

## Known limitations (documented, not hidden)

- No real browser-based measurement - everything is CrUX + Google's hosted PSI API + a
  fetch-based timing check. A dedicated headless-browser worker is a documented future option
  (see `PROJECT_AUDIT.md`'s recommended architecture), not something to reintroduce casually
  given the serverless-stability reasons Playwright was disabled in the first place.
- CrUX has no data for low-traffic sites (falls back to lab-only scoring, lower confidence).
- The manual network check is a coarse single-request timing measurement, not a full
  waterfall - it's meant to catch obviously slow TTFB, not replace real APM.
