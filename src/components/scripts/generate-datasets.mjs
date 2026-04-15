// scripts/generate-datasets.mjs
import { runEnhancedScanner } from '../src/lib/scanner/enhanced.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://www.whyismywebsiteslow.com';

// Add more targets as you create new PSEO pages
const targets = [
  { slug: 'why-is-my-wordpress-site-slow-on-mobile', url: 'https://example.com' },
  { slug: 'shopify-store-slow-after-theme-update', url: 'https://shopify.com' },
  { slug: 'elementor-making-wordpress-slow-fix', url: 'https://elementor.com' },
  { slug: 'woocommerce-cart-page-slow', url: 'https://woocommerce.com' },
  { slug: 'next-js-app-slow-first-load', url: 'https://nextjs.org' },
  { slug: 'divi-theme-making-wordpress-slow', url: 'https://elegantthemes.com' },
  { slug: 'why-is-my-squarespace-site-slow', url: 'https://squarespace.com' },
  { slug: 'too-many-plugins-making-wordpress-slow', url: 'https://wordpress.org' },
];

async function generateDatasets() {
  const datasets = [];

  for (const target of targets) {
    console.log(`🔍 Scanning ${target.url}...`);
    const result = await runEnhancedScanner(target.url, 'mobile');

    const dataset = {
      slug: target.slug,
      overallScore: result.overallScore,
      grade: result.grade,
      confidence: result.confidence,
      rum: result.rum,
      cwvScores: [
        { label: "Performance", score: Math.round(result.lab.lighthouse.performance * 100) },
        { label: "LCP", score: Math.round(result.lab.cwv.lcp_ms || 0) },
        { label: "CLS", score: Math.round((result.lab.cwv.cls || 0) * 100) },
      ],
      lighthouse: result.lab.lighthouse,
      issues: [], // expand later with real issues from scanner
      calculator: {
        monthlyVisitors: 12000,
        conversionRate: 2.5,
        averageOrderValue: 85,
        improvementPct: 40
      }
    };

    datasets.push(dataset);
    console.log(`✅ Generated dataset for ${target.slug}`);
  }

  const filePath = path.join(process.cwd(), 'src/data/performance-datasets.json');
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(datasets, null, 2));

  console.log(`\n🎉 Engine complete! Datasets saved to src/data/performance-datasets.json`);
  console.log(`Run this script again anytime to refresh real data.`);
}

generateDatasets().catch(console.error);