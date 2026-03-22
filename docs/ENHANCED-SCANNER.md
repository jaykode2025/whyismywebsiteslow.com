# Enhanced Scanner - Better Than Google PageSpeed Insights Alone

## Overview

The enhanced scanner (`src/lib/scanner/enhanced.ts`) combines **multiple data sources** for more accurate, actionable performance insights than PSI/Lighthouse alone.

## Data Sources

### 1. CrUX API (Chrome UX Report) - **Real-User Metrics**
- **What**: Actual performance data from real Chrome users visiting your site
- **Why better**: Lab simulations (Lighthouse) can't replicate real-world conditions
- **Metrics**: LCP, INP, CLS, FCP, TTFB from actual users
- **Confidence scoring**: Based on sample size (>1000 = high confidence)

### 2. PSI/Lighthouse - **Lab Metrics**
- **What**: Controlled, reproducible diagnostics
- **Why keep it**: Detailed audits and recommendations
- **Metrics**: Performance, Accessibility, Best Practices, SEO scores
- **Audits**: Unused JS/CSS, image optimization, cache policy, render blocking

### 3. Network Checks - **Infrastructure Metrics**
- **What**: Direct server response timing
- **Why better**: PSI doesn't expose raw TTFB accurately
- **Metrics**: TTFB, DNS, TLS, redirect count/time

## Scoring Algorithm

The overall score (0-100, A-F grade) weights sources by reliability:

```
Real-user metrics (CrUX): 60% weight
Lab metrics (PSI):        40% weight
```

**Why this matters:**
- A site with perfect Lighthouse scores but poor real-user performance gets a **lower score**
- A site with good real-user metrics but imperfect lab scores gets a **fair score**
- Confidence levels adjust weighting (low sample = less weight)

## Usage

```typescript
import { runEnhancedScanner } from "./lib/scanner/enhanced";

const result = await runEnhancedScanner("https://example.com", "mobile");

// Access real-user metrics
console.log(result.rum.lcp_ms);        // Real-user LCP
console.log(result.rum.confidence);    // "high" | "medium" | "low"

// Access lab metrics
console.log(result.lab.lighthouse.performance);  // 0-1 scale

// Access network metrics
console.log(result.network.ttfb_ms);   // Server response time

// Get combined score
console.log(result.overallScore);      // 0-100
console.log(result.grade);             // "A" | "B" | "C" | "D" | "F"

// Check data availability
console.log(result.sources.rumAvailable);  // true if CrUX data exists
```

## Integration

The enhanced scanner is automatically used in `src/lib/scan.enhanced.ts`:

```typescript
// Old approach (PSI only)
const psi = await fetchPsi(url, device);

// New approach (CrUX + PSI + Network)
const enhanced = await runEnhancedScanner(url, device);
const psi = enhanced.lab;  // Backward compatible
psi.rum = enhanced.rum;    // Real-user metrics
psi.network = enhanced.network;  // Network timing
psi.overallScore = enhanced.overallScore;  // Combined score
psi.grade = enhanced.grade;  // A-F grade
```

## API Endpoints

### CrUX API
- **Endpoint**: `https://chromeuxreport.googleapis.com/v1/records:queryRecord`
- **Auth**: None required (free, rate-limited)
- **Limits**: ~100 requests/minute

### PSI API
- **Endpoint**: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`
- **Auth**: Optional API key (higher rate limits)
- **Limits**: 25/hour without key, 500/hour with key

## Fallback Behavior

The scanner gracefully degrades if sources are unavailable:

1. **No CrUX data** (new/rare sites): Falls back to PSI-only scoring
2. **PSI rate limited**: Returns cached/error state with mock data
3. **Network timeout**: Continues with available data

## Example Output

```json
{
  "rum": {
    "lcp_ms": 2100,
    "inp_ms": 180,
    "cls": 0.08,
    "status": "pass",
    "sampleSize": 5420,
    "confidence": "high"
  },
  "lab": {
    "lighthouse": {
      "performance": 0.87,
      "seo": 0.95
    },
    "cwv": {
      "lcp_ms": 2400,
      "status": "pass"
    }
  },
  "network": {
    "ttfb_ms": 420,
    "redirect_count": 0
  },
  "overallScore": 89,
  "grade": "B",
  "sources": {
    "rumAvailable": true,
    "labAvailable": true,
    "networkAvailable": true
  }
}
```

## Why This Beats PSI Alone

| Metric | PSI Only | Enhanced Scanner |
|--------|----------|------------------|
| **Data source** | Lab simulation | Real users + lab |
| **TTFB accuracy** | Estimated | Direct measurement |
| **Scoring bias** | Synthetic environment | Real-world weighted |
| **Confidence** | None | Sample size tracked |
| **Network insights** | Limited | DNS, TLS, redirects |

## Future Enhancements

Potential improvements:
- Add WebPageTest API integration
- Include third-party script impact analysis
- Track historical trends per origin
- Add geographic performance breakdowns
- Integrate with Google Analytics 4 for custom RUM
