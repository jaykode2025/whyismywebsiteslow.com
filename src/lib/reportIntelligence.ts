import type { BusinessImpact, DetectedStack, RecommendationSummary, Report, CodeSnippet } from "./types";

function containsAny(haystack: string, needles: string[]) {
  return needles.some((needle) => haystack.includes(needle));
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

function detectFramework(html: string | null, headers: Headers | null) {
  const body = normalizeText(html);
  const server = normalizeText(headers?.get("server"));
  const poweredBy = normalizeText(headers?.get("x-powered-by"));

  if (containsAny(body, ["/_astro/", 'generator" content="astro', "astro-island"])) {
    return { value: "Astro", confidence: "high" as const };
  }
  if (containsAny(body, ["/_next/", "__next"])) {
    return { value: "Next.js", confidence: "high" as const };
  }
  if (containsAny(body, ["/_nuxt/", "__nuxt"])) {
    return { value: "Nuxt", confidence: "high" as const };
  }
  if (containsAny(poweredBy, ["next.js"])) {
    return { value: "Next.js", confidence: "medium" as const };
  }
  if (containsAny(server, ["vercel"])) {
    return { value: "Likely JAMstack/SSR app", confidence: "low" as const };
  }
  return { value: null, confidence: "low" as const };
}

function detectCms(html: string | null, headers: Headers | null) {
  const body = normalizeText(html);
  const server = normalizeText(headers?.get("server"));

  if (containsAny(body, ["/wp-content/", "/wp-includes/", "wp-json", 'generator" content="wordpress'])) {
    return { value: "WordPress", confidence: "high" as const };
  }
  if (containsAny(body, ["cdn.shopify.com", "shopify-section", "shopify.theme"])) {
    return { value: "Shopify", confidence: "high" as const };
  }
  if (containsAny(body, ["static.wixstatic.com", "wix.com website builder"])) {
    return { value: "Wix", confidence: "high" as const };
  }
  if (containsAny(body, ["static.squarespace.com", "squarespace"])) {
    return { value: "Squarespace", confidence: "high" as const };
  }
  if (containsAny(body, ["webflow", "data-wf-page", "data-wf-site"])) {
    return { value: "Webflow", confidence: "high" as const };
  }
  if (containsAny(server, ["shopify"])) {
    return { value: "Shopify", confidence: "medium" as const };
  }
  return { value: null, confidence: "low" as const };
}

function detectHosting(headers: Headers | null) {
  const server = normalizeText(headers?.get("server"));
  const poweredBy = normalizeText(headers?.get("x-powered-by"));
  const via = normalizeText(headers?.get("via"));

  if (headers?.get("x-vercel-id") || containsAny(server, ["vercel"])) {
    return { value: "Vercel", confidence: "high" as const };
  }
  if (headers?.get("x-nf-request-id") || containsAny(server, ["netlify"])) {
    return { value: "Netlify", confidence: "high" as const };
  }
  if (headers?.get("cf-ray") || containsAny(server, ["cloudflare"]) || containsAny(via, ["cloudflare"])) {
    return { value: "Cloudflare", confidence: "high" as const };
  }
  if (containsAny(server, ["wp engine", "wpengine"])) {
    return { value: "WP Engine", confidence: "high" as const };
  }
  if (containsAny(poweredBy, ["express", "next.js"])) {
    return { value: "Custom app hosting", confidence: "low" as const };
  }
  return { value: null, confidence: "low" as const };
}

export function detectStack(params: { html: string | null; headers: Headers | null }): DetectedStack {
  const framework = detectFramework(params.html, params.headers);
  const cms = detectCms(params.html, params.headers);
  const hosting = detectHosting(params.headers);
  const confidenceLevels = [framework.confidence, cms.confidence, hosting.confidence];
  const confidence = confidenceLevels.includes("high")
    ? "high"
    : confidenceLevels.includes("medium")
      ? "medium"
      : "low";

  return {
    frameworkGuess: framework.value,
    cmsGuess: cms.value,
    hostingGuess: hosting.value,
    confidence,
  };
}

/**
 * Generate precise, zero-dependency code snippets for identified performance issues.
 * Each snippet is tailored to the specific issue category and includes implementation context.
 */
export function generateCodeSnippets(report: Pick<Report, "insights" | "psi" | "checks" | "detectedStack">): CodeSnippet[] {
  const snippets: CodeSnippet[] = [];
  const stack = report.detectedStack;
  
  // Track which snippet types we've already added to avoid duplicates
  const addedSnippetTypes = new Set<string>();

  for (const insight of report.insights) {
    // Render-blocking resources (CSS/JS)
    if (insight.category === "css" && insight.title.toLowerCase().includes("render-blocking") && !addedSnippetTypes.has("preload-css")) {
      addedSnippetTypes.add("preload-css");
      snippets.push({
        id: `snippet-preload-css-${Date.now()}`,
        title: "Preload Critical CSS",
        description: "Inline or preload above-the-fold CSS to eliminate render-blocking delays.",
        language: "html",
        code: `<link rel="preload" href="/styles/critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles/critical.css"></noscript>`,
        placement: "head",
        impact: "high",
        effort: "low",
        docs: [
          { url: "https://web.dev/articles/preload", label: "Preload assets for faster page loads" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/preload", label: "MDN: preload link type" },
        ],
      });
    }

    // Render-blocking JavaScript
    if (insight.category === "javascript" && insight.title.toLowerCase().includes("render-blocking") && !addedSnippetTypes.has("defer-js")) {
      addedSnippetTypes.add("defer-js");
      snippets.push({
        id: `snippet-defer-js-${Date.now()}`,
        title: "Defer Non-Critical JavaScript",
        description: "Add defer attribute to scripts that don't need to execute immediately.",
        language: "html",
        code: `<script src="/scripts/non-critical.js" defer></script>`,
        placement: "head or before closing body tag",
        impact: "high",
        effort: "low",
        docs: [
          { url: "https://web.dev/articles/optimize-javascript-execution", label: "Optimize JavaScript execution" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-defer", label: "MDN: script defer attribute" },
        ],
      });
    }

    // Unused JavaScript
    if (insight.category === "javascript" && insight.title.toLowerCase().includes("unused") && !addedSnippetTypes.has("code-splitting")) {
      addedSnippetTypes.add("code-splitting");
      snippets.push({
        id: `snippet-code-split-${Date.now()}`,
        title: "Implement Code Splitting",
        description: "Split large JavaScript bundles and load code on-demand using dynamic imports.",
        language: "javascript",
        code: `// Dynamic import for code splitting
const heavyModule = await import('./heavy-module.js');
heavyModule.init();

// Or use intersection observer for lazy hydration
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        import('./heavy-component.js').then(module => module.init());
        observer.unobserve(entry.target);
      }
    });
  });
  document.querySelectorAll('[data-lazy-load]').forEach(el => observer.observe(el));
}`,
        placement: "Component initialization or module loader",
        impact: "high",
        effort: "medium",
        docs: [
          { url: "https://web.dev/articles/reduce-javascript-payloads-with-code-splitting", label: "Code splitting guide" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import", label: "MDN: dynamic import" },
        ],
      });
    }

    // Image optimization
    if (insight.category === "images" && !addedSnippetTypes.has("modern-images")) {
      addedSnippetTypes.add("modern-images");
      const modernFormat = stack.cmsGuess === "WordPress" 
        ? "Use WebP format via plugin (e.g., ShortPixel, Imagify)"
        : "Convert images to WebP/AVIF formats";
      
      snippets.push({
        id: `snippet-modern-images-${Date.now()}`,
        title: "Serve Images in Modern Formats",
        description: modernFormat,
        language: stack.cmsGuess === "WordPress" ? "php" : "html",
        code: stack.cmsGuess === "WordPress" 
          ? `// Add to functions.php or use a plugin
function serve_webp_images($html) {
    if (!is_admin()) {
        $html = str_replace('.jpg', '.webp', $html);
        $html = str_replace('.png', '.webp', $html);
    }
    return $html;
}
add_filter('the_content', 'serve_webp_images');`
          : `<picture>
  <source srcset="/images/hero.avif" type="image/avif">
  <source srcset="/images/hero.webp" type="image/webp">
  <img src="/images/hero.jpg" alt="Hero image" loading="lazy" width="1200" height="630">
</picture>`,
        placement: stack.cmsGuess === "WordPress" ? "theme functions.php" : "Image templates",
        impact: "high",
        effort: "medium",
        docs: [
          { url: "https://web.dev/articles/modern-image-formats", label: "Modern image formats" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture", label: "MDN: picture element" },
        ],
      });
    }

    // Lazy loading images
    if (insight.category === "images" && insight.title.toLowerCase().includes("lazy") && !addedSnippetTypes.has("lazy-images")) {
      addedSnippetTypes.add("lazy-images");
      snippets.push({
        id: `snippet-lazy-images-${Date.now()}`,
        title: "Native Lazy Loading for Images",
        description: "Add loading='lazy' to below-the-fold images to reduce initial page weight.",
        language: "html",
        code: `<img src="/images/below-fold.jpg" alt="Description" loading="lazy" width="800" height="600">`,
        placement: "All below-the-fold img elements",
        impact: "medium",
        effort: "low",
        docs: [
          { url: "https://web.dev/articles/browser-level-image-lazy-loading", label: "Native image lazy loading" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#attr-loading", label: "MDN: loading attribute" },
        ],
      });
    }

    // Font optimization - preloading
    if (insight.category === "fonts" && insight.title.toLowerCase().includes("font") && !addedSnippetTypes.has("preload-fonts")) {
      addedSnippetTypes.add("preload-fonts");
      snippets.push({
        id: `snippet-preload-fonts-${Date.now()}`,
        title: "Preload Critical Fonts",
        description: "Preload critical web fonts to prevent layout shift and improve text rendering.",
        language: "html",
        code: `<link rel="preload" href="/fonts/critical.woff2" as="font" type="font/woff2" crossorigin>`,
        placement: "Document head, before CSS links",
        impact: "high",
        effort: "low",
        docs: [
          { url: "https://web.dev/articles/optimize-webfont-loading", label: "Optimize web font loading" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Link_types/preload", label: "MDN: preload for fonts" },
        ],
      });
    }

    // Font display swap
    if (insight.category === "fonts" && insight.title.toLowerCase().includes("swap") && !addedSnippetTypes.has("font-display")) {
      addedSnippetTypes.add("font-display");
      snippets.push({
        id: `snippet-font-display-${Date.now()}`,
        title: "Use font-display: swap",
        description: "Add font-display: swap to @font-face rules to show system fonts while web fonts load.",
        language: "css",
        code: `@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0000-00FF; /* Latin characters only for faster load */
}`,
        placement: "CSS @font-face declarations",
        impact: "medium",
        effort: "low",
        docs: [
          { url: "https://web.dev/articles/optimize-webfont-loading#font-display", label: "font-display: swap guide" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display", label: "MDN: font-display" },
        ],
      });
    }

    // Third-party script optimization
    if (insight.category === "third-party" && !addedSnippetTypes.has("third-party-defer")) {
      addedSnippetTypes.add("third-party-defer");
      snippets.push({
        id: `snippet-third-party-defer-${Date.now()}`,
        title: "Defer Third-Party Scripts with IntersectionObserver",
        description: "Load heavy marketing/analytics scripts only when user scrolls or interacts.",
        language: "javascript",
        code: `// Defer third-party scripts until user interaction
window.addEventListener('scroll', () => {
  // Load analytics/marketing scripts on first scroll
  const scripts = [
    { src: 'https://analytics.example.com/tracker.js', id: 'analytics' },
    { src: 'https://marketing.example.com/pixel.js', id: 'marketing' }
  ];
  
  scripts.forEach(({ src, id }) => {
    if (!document.getElementById(id)) {
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.defer = true;
      document.body.appendChild(script);
    }
  });
}, { once: true });

// Alternative: Load on idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    // Load non-critical third-party scripts
  });
}`,
        placement: "Main JavaScript bundle or separate loader script",
        impact: "high",
        effort: "medium",
        docs: [
          { url: "https://web.dev/articles/identify-opportunities-to-reduce-third-party-impact", label: "Reduce third-party impact" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver", label: "MDN: IntersectionObserver" },
        ],
      });
    }

    // Server response time / TTFB optimization
    if (insight.category === "server" && (insight.title.toLowerCase().includes("ttfb") || insight.title.toLowerCase().includes("server")) && !addedSnippetTypes.has("cache-headers")) {
      addedSnippetTypes.add("cache-headers");
      const cacheConfig = stack.hostingGuess === "Vercel" 
        ? `// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "CDN-Cache-Control", "value": "public, max-age=31536000" }
      ]
    }
  ]
}`
        : stack.hostingGuess === "Netlify"
          ? `# netlify.toml
[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"`
          : `# Apache .htaccess
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
</IfModule>

# Nginx configuration
location ~* \\.(css|js|webp|avif)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}`;
      
      snippets.push({
        id: `snippet-cache-headers-${Date.now()}`,
        title: "Configure Aggressive Caching Headers",
        description: "Set long-lived cache headers for static assets to reduce server load and improve repeat visits.",
        language: stack.hostingGuess === "Vercel" ? "json" : stack.hostingGuess === "Netlify" ? "toml" : "apacheconf",
        code: cacheConfig,
        placement: stack.hostingGuess === "Vercel" ? "vercel.json" : stack.hostingGuess === "Netlify" ? "netlify.toml" : "Server config",
        impact: "high",
        effort: "low",
        docs: [
          { url: "https://web.dev/articles/uses-long-cache-ttl", label: "Use long cache TTLs" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control", label: "MDN: Cache-Control" },
        ],
      });
    }

    // Compression (gzip/brotli)
    if (insight.category === "server" && insight.title.toLowerCase().includes("compression") && !addedSnippetTypes.has("compression")) {
      addedSnippetTypes.add("compression");
      const compressionConfig = stack.hostingGuess === "Vercel"
        ? "// Vercel enables Brotli compression automatically"
        : stack.hostingGuess === "Netlify"
          ? "# Netlify enables compression automatically"
          : `# Nginx compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_proxied expired no-cache no-store private auth;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
gzip_disable "MSIE [1-6]\.";

# Apache compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/javascript application/json
  DeflateCompressionLevel 6
</IfModule>`;
      
      snippets.push({
        id: `snippet-compression-${Date.now()}`,
        title: "Enable Brotli/Gzip Compression",
        description: "Compress text-based assets to reduce transfer size by 60-80%.",
        language: "nginx",
        code: compressionConfig,
        placement: "Server configuration",
        impact: "high",
        effort: "low",
        docs: [
          { url: "https://web.dev/articles/uses-text-compression", label: "Enable text compression" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Compression", label: "MDN: HTTP compression" },
        ],
      });
    }

    // CDN usage
    if (insight.category === "cdn" && !addedSnippetTypes.has("cdn-setup")) {
      addedSnippetTypes.add("cdn-setup");
      snippets.push({
        id: `snippet-cdn-setup-${Date.now()}`,
        title: "Leverage a Content Delivery Network (CDN)",
        description: "Serve static assets from edge locations closer to users for faster global delivery.",
        language: "text",
        code: `CDN Setup Checklist:
1. Choose a CDN provider (Cloudflare, Fastly, CloudFront, etc.)
2. Point your DNS CNAME to the CDN endpoint
3. Configure origin pull for static assets
4. Set cache rules:
   - Static assets (CSS, JS, images): 1 year
   - HTML pages: No cache or short TTL
   - API responses: Based on content type
5. Enable automatic compression (Brotli preferred)
6. Configure HTTP/2 or HTTP/3 support`,
        placement: "DNS and infrastructure configuration",
        impact: "high",
        effort: "medium",
        docs: [
          { url: "https://web.dev/articles/use-cdn", label: "Use a CDN" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching", label: "MDN: HTTP caching" },
        ],
      });
    }

    // CLS (Cumulative Layout Shift) fixes
    if (insight.category === "core-web-vitals" && insight.title.toLowerCase().includes("cls") && !addedSnippetTypes.has("cls-fixes")) {
      addedSnippetTypes.add("cls-fixes");
      snippets.push({
        id: `snippet-cls-fixes-${Date.now()}`,
        title: "Fix Cumulative Layout Shift (CLS)",
        description: "Reserve space for dynamic content and use explicit dimensions to prevent layout shifts.",
        language: "css",
        code: `/* Always include width and height on images/videos */
img, video {
  max-width: 100%;
  height: auto;
  aspect-ratio: attr(width) / attr(height);
}

/* Reserve space for ads/embeds */
.ad-container {
  min-height: 250px; /* Match expected ad height */
}

/* Use skeleton loaders for dynamic content */
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Avoid inserting content above existing content */
.dynamic-content {
  /* Ensure new content flows naturally without pushing existing content */
}`,
        placement: "Global CSS or component styles",
        impact: "high",
        effort: "medium",
        docs: [
          { url: "https://web.dev/articles/optimize-cls", label: "Optimize Cumulative Layout Shift" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio", label: "MDN: aspect-ratio" },
        ],
      });
    }

    // LCP (Largest Contentful Paint) optimization
    if (insight.category === "core-web-vitals" && insight.title.toLowerCase().includes("lcp") && !addedSnippetTypes.has("lcp-fixes")) {
      addedSnippetTypes.add("lcp-fixes");
      snippets.push({
        id: `snippet-lcp-fixes-${Date.now()}`,
        title: "Optimize Largest Contentful Paint (LCP)",
        description: "Prioritize loading of the largest visible element (usually hero image or main heading).",
        language: "html",
        code: `<!-- Preload LCP image -->
<link rel="preload" as="image" href="/images/hero.webp">

<!-- Don't lazy-load the LCP element -->
<img src="/images/hero.webp" alt="Hero" width="1200" height="630" fetchpriority="high">

<!-- Inline critical CSS for above-the-fold content -->
<style>
  .hero { 
    min-height: 60vh; 
    background: url('/images/hero.webp') center/cover;
  }
</style>

<!-- Reduce server response time (TTFB) -->
<!-- Use edge caching, optimize backend queries, enable compression -->`,
        placement: "Document head and critical CSS",
        impact: "high",
        effort: "medium",
        docs: [
          { url: "https://web.dev/articles/optimize-lcp", label: "Optimize LCP" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/fetchpriority", label: "MDN: fetchpriority" },
        ],
      });
    }

    // INP (Interaction to Next Paint) optimization
    if (insight.category === "core-web-vitals" && insight.title.toLowerCase().includes("inp") && !addedSnippetTypes.has("inp-fixes")) {
      addedSnippetTypes.add("inp-fixes");
      snippets.push({
        id: `snippet-inp-fixes-${Date.now()}`,
        title: "Optimize Interaction to Next Paint (INP)",
        description: "Break up long tasks and defer non-critical work to improve responsiveness.",
        language: "javascript",
        code: `// Break up long tasks with requestIdleCallback or setTimeout
function processLargeDataset(data) {
  let index = 0;
  function processChunk() {
    const chunkSize = 100;
    const end = Math.min(index + chunkSize, data.length);
    
    for (let i = index; i < end; i++) {
      // Process item
    }
    
    index = end;
    if (index < data.length) {
      requestIdleCallback(processChunk);
    }
  }
  requestIdleCallback(processChunk);
}

// Debounce expensive event handlers
let debounceTimer;
searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performSearch(e.target.value);
  }, 300);
});

// Use Web Workers for CPU-intensive tasks
if (typeof Worker !== 'undefined') {
  const worker = new Worker('/workers/heavy-task.js');
  worker.postMessage({ data: largeDataset });
  worker.onmessage = (e) => {
    console.log('Result:', e.data);
  };
}`,
        placement: "Event handlers and data processing logic",
        impact: "high",
        effort: "medium",
        docs: [
          { url: "https://web.dev/articles/inp", label: "Optimize INP" },
          { url: "https://developer.mozilla.org/en-US/docs/Web/API/requestIdleCallback", label: "MDN: requestIdleCallback" },
        ],
      });
    }
  }

  // If no specific snippets were generated, provide general optimization boilerplate
  if (snippets.length === 0) {
    snippets.push({
      id: `snippet-general-${Date.now()}`,
      title: "General Performance Best Practices",
      description: "Apply these foundational optimizations across your site.",
      language: "html",
      code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Preconnect to critical origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://cdn.example.com" crossorigin>
  
  <!-- DNS prefetch for third-party domains -->
  <link rel="dns-prefetch" href="https://analytics.example.com">
  
  <!-- Preload critical assets -->
  <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/styles/critical.css" as="style">
  
  <!-- Inline critical CSS -->
  <style>
    /* Above-the-fold styles only */
    body { margin: 0; font-family: system-ui; }
    .hero { min-height: 60vh; }
  </style>
</head>
<body>
  <!-- Content here -->
  
  <!-- Defer non-critical scripts -->
  <script src="/app.js" defer></script>
</body>
</html>`,
      placement: "Base HTML template",
      impact: "medium",
      effort: "medium",
      docs: [
        { url: "https://web.dev/articles/fast", label: "Web.dev performance guides" },
        { url: "https://developer.mozilla.org/en-US/docs/Web/Performance", label: "MDN: Web performance" },
      ],
    });
  }

  return snippets;
}

export function buildBusinessImpact(report: Pick<Report, "canonicalHost" | "summary" | "psi" | "checks" | "insights">): BusinessImpact {
  const score = report.summary.score100;
  const lcpMs = report.psi.cwv.lcp_ms ?? 0;
  const ttfbMs = report.psi.cwv.ttfb_ms ?? 0;
  const requestCount = report.checks.page.requestCount ?? 0;
  const highImpactIssues = report.insights.filter((item) => item.impact === "high").length;

  const riskLevel: BusinessImpact["riskLevel"] =
    score >= 90 && report.psi.cwv.status === "pass"
      ? "low"
      : score >= 70 && highImpactIssues < 2
        ? "medium"
        : "high";

  const headline =
    riskLevel === "low"
      ? "The site is not in urgent trouble, but tightening the biggest friction points should protect conversions."
      : riskLevel === "medium"
        ? "The site is leaving some trust and conversion upside on the table because the first impression is slower than it needs to be."
        : "The site is slow enough to create real revenue risk by delaying trust, interaction, and page completion.";

  const bullets = [
    lcpMs > 0
      ? `Visitors are waiting about ${(lcpMs / 1000).toFixed(1)}s to see the main content, which increases abandonment on first load.`
      : "The current scan shows meaningful delay before users see the main content.",
    ttfbMs > 800
      ? `Server response is ${Math.round(ttfbMs)} ms, so every other optimization starts from a slower baseline.`
      : "Server response is not the biggest issue, so front-end cleanup should return faster wins.",
    requestCount > 70
      ? `The page makes ${requestCount} requests, which adds coordination overhead and makes regressions easier to trigger.`
      : `The strongest business case is reducing the top ${Math.max(1, highImpactIssues)} high-impact bottlenecks before they compound.`,
  ];

  const estimatedRange =
    riskLevel === "low"
      ? {
          conversionLiftPct: "2-6%",
          leadRecoveryPct: "1-4%",
          revenueProtection: "$100-$500/mo",
        }
      : riskLevel === "medium"
        ? {
            conversionLiftPct: "6-14%",
            leadRecoveryPct: "4-9%",
            revenueProtection: "$300-$1,500/mo",
          }
        : {
            conversionLiftPct: "12-28%",
            leadRecoveryPct: "8-18%",
            revenueProtection: "$750-$4,000+/mo",
          };

  return {
    riskLevel,
    headline,
    bullets,
    estimatedRange,
  };
}

export function buildRecommendationSummary(report: Pick<Report, "insights" | "summary">): RecommendationSummary {
  const sorted = [...report.insights].sort((a, b) => {
    const impactRank = a.impact === b.impact ? 0 : a.impact === "high" ? -1 : b.impact === "high" ? 1 : a.impact === "medium" ? -1 : 1;
    if (impactRank !== 0) return impactRank;
    if (a.effort !== b.effort) return a.effort === "low" ? -1 : b.effort === "low" ? 1 : a.effort === "medium" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  const quickWins = sorted
    .filter((item) => item.effort === "low")
    .slice(0, 3)
    .map((item) => item.title);

  const highestLeverageFixes = sorted.slice(0, 3).map((item) => item.title);

  const nextBestAction: RecommendationSummary["nextBestAction"] =
    report.summary.score100 < 70
      ? "request-service"
      : report.summary.score100 >= 90
        ? "start-monitoring"
        : "unlock-report";

  return {
    quickWins,
    highestLeverageFixes,
    nextBestAction,
  };
}
