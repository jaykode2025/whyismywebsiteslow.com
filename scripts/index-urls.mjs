/**
 * Google Indexing API Script
 * 
 * Usage: 
 * 1. Get a Service Account Key (JSON) from Google Cloud Console.
 * 2. Enable "Indexing API" for that project.
 * 3. Give the service account "Owner" permissions in Google Search Console for your site.
 * 4. Run: GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node scripts/index-urls.mjs
 */

import { PROBLEMS, PLATFORMS, INDUSTRIES, LOCATIONS } from '../src/data/pseo.js';

const BASE_URL = 'https://www.whyismywebsiteslow.com';

const urls = [
  `${BASE_URL}/`,
  `${BASE_URL}/website-speed-audit/`,
  `${BASE_URL}/why-is-my-website-slow/`,
  ...PROBLEMS.map(p => `${BASE_URL}/why-is-my-website-slow/${p.slug}/`),
  ...PLATFORMS.map(p => `${BASE_URL}/website-speed-audit/platform/${p.platform}/`),
  ...INDUSTRIES.map(i => `${BASE_URL}/website-speed-audit/industry/${i.industry}/`),
  ...LOCATIONS.map(l => `${BASE_URL}/website-speed-audit/location/${l.location}/`),
  ...PLATFORMS.flatMap(p => INDUSTRIES.map(i => `${BASE_URL}/website-speed-audit/platform/${p.platform}/industry/${i.industry}/`))
];

console.log(`Found ${urls.length} URLs to index.`);

// Note: To actually run this, you need the 'googleapis' package.
// For now, I'm providing the script structure. You can run it locally.
/*
import { google } from 'googleapis';

const jwtClient = new google.auth.JWT(
  key.client_email,
  null,
  key.private_key,
  ['https://www.googleapis.com/auth/indexing'],
  null
);

jwtClient.authorize(function(err, tokens) {
  if (err) {
    console.error(err);
    return;
  }
  
  urls.forEach(url => {
    const options = {
      url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
      method: 'POST',
      auth: jwtClient,
      body: JSON.stringify({
        url: url,
        type: 'URL_UPDATED'
      })
    };
    // Make request...
    console.log(`Indexed: ${url}`);
  });
});
*/

console.log("Ready to blast URLs to Google. Step 1: Install googleapis.");
console.log("npm install googleapis");
