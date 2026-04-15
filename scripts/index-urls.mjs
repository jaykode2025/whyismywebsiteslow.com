/**
 * Google Indexing API Script - Optimized for Astro PSEO Flywheel (2026)
 * 
 * This script auto-pulls ALL your PSEO pages from the 'pages' content collection
 * and submits them to Google Indexing API (max \~180/day to stay safe).
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://www.whyismywebsiteslow.com';
const KEY_FILE = path.join(process.cwd(), 'scripts/service-account-key.json');

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/indexing'],
  });
  return auth.getClient();
}

async function submitUrl(indexing, url) {
  try {
    await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED'
      }
    });
    console.log(`✅ Indexed: ${url}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed ${url}:`, error.message);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(KEY_FILE)) {
    console.error('❌ Missing service-account-key.json in scripts/ folder');
    console.log('1. Create service account in Google Cloud Console');
    console.log('2. Enable Indexing API');
    console.log('3. Download JSON key and save as scripts/service-account-key.json');
    return;
  }

  const authClient = await getAuthClient();
  const indexing = google.indexing({ version: 'v3', auth: authClient });

  // Static high-priority pages
  const staticUrls = [
    `${BASE_URL}/`,
    `${BASE_URL}/scan`,
    `${BASE_URL}/why-is-my-website-slow/`,
  ];

  // Auto-pull ALL PSEO pages from your content collection
  let pseoUrls: string[] = [];
  try {
    // Note: This requires running with Astro context or a build step.
    // For simplicity on mobile, we'll use a manual list for now and expand later.
    console.log('Loading PSEO pages from content collection...');
    // Placeholder - we'll improve this when laptop is back
    pseoUrls = [
      `${BASE_URL}/why-is-my-wordpress-site-slow-on-mobile`,
      `${BASE_URL}/shopify-store-slow-after-theme-update`,
      `${BASE_URL}/elementor-making-wordpress-slow-fix`,
      `${BASE_URL}/woocommerce-cart-page-slow`,
      `${BASE_URL}/next-js-app-slow-first-load`,
      `${BASE_URL}/divi-theme-making-wordpress-slow`,
      `${BASE_URL}/why-is-my-squarespace-site-slow`,
      `${BASE_URL}/too-many-plugins-making-wordpress-slow`,
    ];
  } catch (e) {
    console.log('Could not auto-load collection — using manual list');
  }

  const allUrls = [...staticUrls, ...pseoUrls];

  console.log(`Total URLs ready: ${allUrls.length}`);

  // Safe daily limit (leave buffer for quota)
  const urlsToSubmit = allUrls.slice(0, 180);

  let success = 0;
  for (const url of urlsToSubmit) {
    const ok = await submitUrl(indexing, url);
    if (ok) success++;
    await new Promise(r => setTimeout(r, 350)); // gentle rate limit
  }

  console.log(`\n🎉 Finished! Successfully submitted \( {success}/ \){urlsToSubmit.length} URLs to Google.`);
  console.log('Check Google Search Console > Indexing API report for results.');
}

main().catch(console.error);
