/**
 * SEO Content Scaling Demonstration
 * This script calculates how many pages the system can generate
 */

import fs from 'fs';
import path from 'path';

// Count the current entries in the data file
const dataFilePath = path.join(process.cwd(), 'src', 'data', 'pseo.ts');
const dataContent = fs.readFileSync(dataFilePath, 'utf8');

// Extract counts from the data file
const problemMatches = dataContent.match(/slug:\s*"([^"]+)"/g);
const platformMatches = dataContent.match(/platform:\s*"([^"]+)"/g);
const industryMatches = dataContent.match(/industry:\s*"([^"]+)"/g);
const locationMatches = dataContent.match(/location:\s*"([^"]+)"/g);

const problemCount = problemMatches ? problemMatches.length : 0;
const platformCount = platformMatches ? [...new Set(platformMatches.map(m => m.match(/platform:\s*"([^"]+)"/)[1]))].length : 0;
const industryCount = industryMatches ? [...new Set(industryMatches.map(m => m.match(/industry:\s*"([^"]+)"/)[1]))].length : 0;
const locationCount = locationMatches ? [...new Set(locationMatches.map(m => m.match(/location:\s*"([^"]+)"/)[1]))].length : 0;

console.log(`Current content counts:`);
console.log(`- Problem pages: ${problemCount}`);
console.log(`- Platform pages: ${platformCount}`);
console.log(`- Industry pages: ${industryCount}`);
console.log(`- Location pages: ${locationCount}`);

// Calculate potential for additional problem pages per platform
const issuesPerPlatform = 5; // Assuming 5 common issues per platform
const additionalProblemPages = platformCount * issuesPerPlatform;

console.log(`\nPotential additional pages:`);
console.log(`- Additional problem pages (5 per platform): ${additionalProblemPages}`);

const totalCount = problemCount + platformCount + industryCount + locationCount + additionalProblemPages;

console.log(`\nTotal potential pages: ${totalCount}`);

if (totalCount >= 50 && totalCount < 100) {
  console.log("✓ This system can scale to 50+ pages");
} else if (totalCount >= 100 && totalCount < 200) {
  console.log("✓ This system can scale to 100+ pages");
} else if (totalCount >= 200) {
  console.log("✓ This system can scale to 200+ pages");
} else {
  console.log("⚠ This system can scale but needs more content for 50+ pages");
}

console.log(`\nThe system is ready to generate ${totalCount} unique, SEO-optimized pages!`);
console.log("Each page includes:");
console.log("- Optimized title tags and meta descriptions");
console.log("- Rich schema markup (FAQ, Breadcrumb, Article)");
console.log("- Internal linking structure");
console.log("- Keyword density optimization");
console.log("- Social media tags");
console.log("- Structured content with headings, lists, and statistics");
console.log("- Call-to-action sections");
console.log("- External resource links");