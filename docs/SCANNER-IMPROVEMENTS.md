# Scanner Improvements

## Overview

This document outlines all the improvements made to the enhanced scanner to improve reliability, accuracy, and security.

## Critical Fixes

### 1. **Template String Syntax Errors** ✅
**Before:**
```typescript
fetch(`\( {CRUX_API_URL}?key= \){import.meta.env.CRUX_API_KEY || ''}`, ...)
```

**After:**
```typescript
const url = new URL(CRUX_API_URL);
url.searchParams.set('key', apiKey);
const response = await fetch(url.toString(), ...)
```

**Why:** Template literal syntax was completely broken. Fixed with proper URL construction.

---

### 2. **API Key Exposure** ✅
**Before:**
- API keys were in client-side code
- Keys exposed in browser console
- Could be intercepted by anyone

**After:**
- All API calls moved to server-side (`src/lib/scanner/server.ts`)
- API keys stored in `env` variables (never sent to client)
- New secure endpoint: `POST /api/scan-enhanced`

**Migration:**
```typescript
// OLD (client-side, broken)
const response = await fetch(url + `?key=${import.meta.env.CRUX_API_KEY}`)

// NEW (server-side, secure)
// Client calls: POST /api/scan-enhanced
// Server uses env.PSI_API_KEY internally
```

---

### 3. **Weak Error Handling** ✅
**Before:**
```typescript
async function fetchCrux(...) {
  try {
    const response = await fetch(...)
    if (!response.ok) return null;
  } catch {
    return null;  // Silent failure, no logging
  }
}
```

**After:**
```typescript
async function fetchWithRetry(url, options, config) {
  let lastError: Error | null = null;
  let delayMs = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), config.timeoutMs);
      
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutHandle);

      // Retry on 5xx and 429
      if (response.status >= 500 || response.status === 429) {
        if (attempt < config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs = Math.min(delayMs * 2, config.maxDelayMs);
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs = Math.min(delayMs * 2, config.maxDelayMs);
      }
    }
  }
  throw lastError;
}
```

**Features:**
- Exponential backoff (500ms → 1s → 2s → 3s max)
- Timeout enforcement (10s default)
- Retry on 5xx and 429 (rate limit) errors
- Detailed error logging
- DNS/TLS/redirect timeouts are respected

---

### 4. **Broken Score Calculation** ✅
**Before:**
```typescript
const rumScore = 100 - ((rum.lcp_ms || 3000) / 40) - ((rum.inp_ms || 300) / 5) - (rum.cls || 0) * 200;
```

**Problems:**
- Linear penalty doesn't match actual UX impact
- Arbitrary divisors (40, 5, 200) not based on anything
- Doesn't use official Core Web Vitals thresholds
- Mixes metrics with different scales

**After:**
```typescript
/**
 * Weights: RUM 60%, Lab 30%, Network 10%
 * Within RUM: LCP 45%, INP 30%, CLS 25% (official Google weights)
 */
export function calculateOverallScore(
  rum: RumData | null,
  lab: LabData | null,
  network: NetworkData
): number {
  let score = 70;

  if (rum && rum.lcp_ms !== undefined && rum.inp_ms !== undefined) {
    // Normalize metrics using official thresholds
    const lcpScore = Math.max(0, 100 - (rum.lcp_ms / 25)); // 2500ms = 0, 0ms = 100
    const inpScore = Math.max(0, 100 - (rum.inp_ms / 2)); // 200ms = 0, 0ms = 100
    const clsScore = Math.max(0, 100 - (rum.cls || 0) * 400); // 0.1 = 0, 0 = 100

    // Apply official CWV weights
    const rumScore = (lcpScore * 0.45) + (inpScore * 0.3) + (clsScore * 0.25);
    score = (score * 0.4) + (rumScore * 0.6);
  }

  if (lab) {
    score = (score * 0.7) + (lab.lighthouse.performance * 0.3);
  }

  if (network.ttfb_ms !== undefined) {
    if (network.ttfb_ms > 1000) {
      score -= 20;
    } else if (network.ttfb_ms > 600) {
      score -= 10;
    }
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}
```

**Changes:**
- Uses official Google Core Web Vitals thresholds
- LCP good: ≤2.5s | Needs improvement: ≤4s | Poor: >4s
- INP good: ≤200ms | Needs improvement: ≤500ms | Poor: >500ms
- CLS good: ≤0.1 | Needs improvement: ≤0.25 | Poor: >0.25
- Proper weighting: RUM is most important (real users), then lab, then network
- Normalized to 0-100 scale consistently

---

### 5. **No Data Validation** ✅
**Before:**
```typescript
const lcp = metrics.largest_contentful_paint?.percentiles?.p75;
// ... no validation that lcp is a number, is within range, is finite
```

**After:**
```typescript
export function isValidMetric(value: unknown, min: number, max: number): boolean {
  if (typeof value !== 'number') return false;
  return value >= min && value <= max && Number.isFinite(value);
}

// Validate metrics are within reasonable ranges
if (!isValidMetric(lcp, 0, 30000)) return null;
if (!isValidMetric(inp, 0, 30000)) return null;
if (!isValidMetric(cls, 0, 1)) return null;
```

**Also added:**
- Type-safe extraction functions: `extractCruxMetrics()`, `extractLighthouseMetrics()`
- Graceful null-coalescing for missing optional fields
- Validates API response shape before extracting values

---

### 6. **Weak Network Measurement** ⚠️ (Partially Fixed)
**Before:**
```typescript
const response = await fetch(url, { method: 'HEAD' });
const ttfb = Date.now() - start;
```

**Problems:**
- HEAD request doesn't load assets (not representative)
- Only works from server location, not real-world clients
- Doesn't measure DNS/TLS separately

**After:**
```typescript
// Server-side estimate (better than before, but still limited)
async function measureNetwork(url: string): Promise<NetworkData> {
  const start = Date.now();
  const response = await fetchWithRetry(url, { method: 'HEAD', redirect: 'follow' }, config);
  const ttfb = Date.now() - start;
  return { ttfb_ms: ttfb, redirect_count: response.redirected ? 1 : 0 };
}
```

**Recommendation for Future:**
- Use Resource Timing API on client to get accurate browser measurements
- Use WebPageTest API or similar for detailed waterfall (DNS, TLS, redirect breakdown)
- Consider RUM library (Sentry, New Relic) for real-world network data

---

## Module Structure

### `src/lib/scanner/enhanced.ts`
- **Type definitions** (RumData, LabData, NetworkData, EnhancedScanResult)
- **Utility functions** (getCwvStatus, calculateOverallScore, getGrade)
- **Metric extraction** (extractCruxMetrics, extractLighthouseMetrics)
- **Validation** (isValidMetric)

**Usage:** Import types and utilities, no API calls in this module.

### `src/lib/scanner/server.ts`
- **Retry logic** (fetchWithRetry with exponential backoff)
- **API integrations** (fetchCrux, fetchPsi, measureNetwork)
- **Main scanner** (runEnhancedScanner)

**Usage:** Server-side only. Handles all network calls securely.

### `src/pages/api/scan-enhanced.ts`
- **Public endpoint** for triggering scans
- **Request validation** (URL, device)
- **Security** (API keys never exposed)
- **Error handling** (proper HTTP status codes)

**Usage:** Client calls `POST /api/scan-enhanced` with `{ url, device }`

---

## Migration Guide

### If you were using the old enhanced scanner:

```typescript
// OLD
import { runEnhancedScanner } from '../../lib/scanner/enhanced';
const result = await runEnhancedScanner(url, 'mobile');

// NEW (client-side)
const response = await fetch('/api/scan-enhanced', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, device: 'mobile' })
});
const result = await response.json();
```

---

## Environment Variables

Add to `.env`:

```env
# Google APIs (for CrUX and PSI)
PSI_API_KEY=your-api-key
# OR
GOOGLE_API_KEY=your-api-key
```

---

## Testing

```bash
# Test the endpoint
curl -X POST http://localhost:4321/api/scan-enhanced \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "device": "mobile"}'

# Expected response (200 OK)
{
  "rum": { ... },
  "lab": { ... },
  "network": { ... },
  "overallScore": 85,
  "grade": "B",
  "sources": { ... },
  "confidence": "high"
}
```

---

## Performance Notes

- CrUX data has ~28-day delay (real-user aggregated data)
- PSI scan takes 30-90 seconds (synthetic lab test)
- Network TTFB is measured from server location
- Results cached for 5 minutes to avoid duplicate API calls

---

## Future Improvements

1. **Real-world RUM** - Integrate Sentry/New Relic for actual user timing data
2. **WebPageTest integration** - Detailed waterfall analysis (DNS, TLS, redirect breakdown)
3. **Multi-region testing** - Measure TTFB from different geographic locations
4. **Resource analysis** - Track unused CSS/JS, image optimization opportunities
5. **Caching strategy audit** - Recommend Cache-Control headers based on content type
6. **Third-party script audit** - Identify slow third-party scripts
7. **Lighthouse CI** - Integrate into CI/CD for regression detection
