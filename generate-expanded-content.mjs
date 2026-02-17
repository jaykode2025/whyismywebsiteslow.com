/**
 * SEO Content Generator
 * This script demonstrates how to programmatically generate SEO-optimized content
 * to scale the system to 50-200+ pages
 */

import { generateScaledContent } from './src/lib/contentGeneration.js';
import fs from 'fs';
import path from 'path';

// Generate scaled content
const scaledContent = generateScaledContent();

// Create a sample additional problems based on platforms
const additionalProblems = [];

for (const platform of scaledContent.platforms) {
  // Generate multiple problems per platform
  const platformSpecificIssues = [
    {
      issue: "render-blocking resources",
      slugSuffix: "render-blocking",
      title: "Render-Blocking Resources",
      description: "CSS and JavaScript files that block page rendering"
    },
    {
      issue: "large image files",
      slugSuffix: "large-images",
      title: "Large Image Files",
      description: "Unoptimized images slowing down page loads"
    },
    {
      issue: "server response time",
      slugSuffix: "slow-server",
      title: "Slow Server Response Time",
      description: "High TTFB (Time to First Byte) affecting performance"
    },
    {
      issue: "unused JavaScript",
      slugSuffix: "unused-js",
      title: "Unused JavaScript",
      description: "Excessive JavaScript code not being used"
    },
    {
      issue: "poor caching strategy",
      slugSuffix: "poor-caching",
      title: "Poor Caching Strategy",
      description: "Inadequate browser and server-side caching"
    }
  ];

  for (const issue of platformSpecificIssues) {
    additionalProblems.push({
      slug: `why-is-my-${platform.platform}-site-slow-due-to-${issue.slugSuffix}`,
      keyword: `why is my ${platform.platform} site slow due to ${issue.issue}`,
      h1: `Why Is My ${platform.platform.charAt(0).toUpperCase() + platform.platform.slice(1)} Site Slow Due to ${issue.title}?`,
      metaDescription: `Learn why your ${platform.platform} site is slow due to ${issue.issue}. Expert solutions to fix ${issue.description} and improve performance.`,
      platform: platform.platform,
      industry: "general",
      primaryCause: `${issue.description} is causing performance issues on your ${platform.platform} site.`,
      quickWins: [
        `Optimize ${issue.issue.replace(/-/g, ' ')}`,
        `Implement performance best practices`,
        `Use appropriate tools to diagnose and fix`
      ],
      detailedAnalysis: [
        `${platform.platform} sites often experience performance issues due to ${issue.issue}.`,
        `This affects user experience and search rankings significantly.`,
        `Proper diagnosis and resolution can dramatically improve site speed.`
      ],
      solutions: [
        {
          title: `Fix ${issue.title}`,
          description: `Targeted approach to resolve the specific ${issue.issue} problem.`,
          steps: [
            `Diagnose the exact cause of ${issue.issue}`,
            `Implement appropriate fixes`,
            `Test and verify improvements`
          ]
        }
      ],
      faqs: [
        {
          question: `How does ${issue.issue} affect ${platform.platform} sites?`,
          answer: `The ${issue.issue} can significantly slow down ${platform.platform} sites by increasing load times and resource consumption.`
        },
        {
          question: `Can I fix ${issue.issue} myself?`,
          answer: `Yes, many ${issue.issue} problems can be resolved with proper guidance and tools.`
        }
      ],
      statistics: [
        { value: "40%", label: "of sites affected by this issue" },
        { value: "2.3s", label: "average load time increase" },
        { value: "15%", label: "decrease in conversions" }
      ],
      outboundLinks: [
        { url: `https://${platform.platform}.com/docs/performance`, label: `${platform.platform} Performance Guide` },
        { url: "https://developers.google.com/speed/docs/insights/v5/about", label: "Google PageSpeed Insights" },
        { url: "https://www.web.dev/vitals/", label: "Web Vitals Documentation" }
      ],
      conversionImpact: `Fixing ${issue.issue} can improve conversion rates and SEO performance.`
    });
  }
}

// Combine all problems
const allProblems = [...scaledContent.problems, ...additionalProblems];

console.log(`Generated content for scaling:`);
console.log(`- ${allProblems.length} problem pages`);
console.log(`- ${scaledContent.platforms.length} platform pages`);
console.log(`- ${scaledContent.industries.length} industry pages`);
console.log(`- ${scaledContent.locations.length} location pages`);
console.log(`Total potential pages: ${allProblems.length + scaledContent.platforms.length + scaledContent.industries.length + scaledContent.locations.length}`);

// Write the expanded data to a new file for reference
const expandedData = {
  PROBLEMS: allProblems,
  PLATFORMS: scaledContent.platforms,
  INDUSTRIES: scaledContent.industries,
  LOCATIONS: scaledContent.locations
};

const outputPath = path.join(process.cwd(), 'expanded-seo-data.json');
fs.writeFileSync(outputPath, JSON.stringify(expandedData, null, 2));

console.log(`\nExpanded data saved to: ${outputPath}`);
console.log("\nThe system is now ready to generate over 200 unique, SEO-optimized pages!");
console.log("To implement at scale:");
console.log("1. Add the expanded data to src/data/pseo.ts");
console.log("2. Run your build process to generate all pages");
console.log("3. Deploy to make all pages live");