import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Report } from './types';

/**
 * Generate a PDF report from performance data
 * Serverless-safe: no headless browser required
 */
export async function generatePDF(report: Report): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size (8.5 x 11 inches)
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPos = height - 40;
  const margin = 40;
  const contentWidth = width - (margin * 2);
  
  // === HEADER ===
  page.drawText('Website Performance Report', {
    x: margin,
    y: yPos,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.3),
  });
  yPos -= 25;
  
  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
    x: margin,
    y: yPos,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  yPos -= 30;
  
  // URL
  const urlLines = wrapText(`Site: ${report.url}`, contentWidth, font, 12);
  for (const line of urlLines) {
    page.drawText(line, {
      x: margin,
      y: yPos,
      size: 12,
      font,
    });
    yPos -= 14;
  }
  yPos -= 10;
  
  // === SCORE BOX ===
  const scoreBoxHeight = 80;
  const scoreBoxWidth = 150;
  
  // Determine color based on grade
  const gradeColor = getGradeColor(report.summary.grade);
  
  page.drawRectangle({
    x: margin,
    y: yPos - scoreBoxHeight,
    width: scoreBoxWidth,
    height: scoreBoxHeight,
    color: gradeColor,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
  });
  
  page.drawText('Overall Score', {
    x: margin + 20,
    y: yPos - 25,
    size: 12,
    font,
    color: rgb(1, 1, 1),
  });
  
  page.drawText(`${report.summary.score100}`, {
    x: margin + 20,
    y: yPos - 50,
    size: 42,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  page.drawText(`Grade: ${report.summary.grade}`, {
    x: margin + 20,
    y: yPos - 70,
    size: 14,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  // === KEY METRICS (right of score box) ===
  const metricsX = margin + scoreBoxWidth + 30;
  let metricsY = yPos - 20;
  
  page.drawText('Key Metrics', {
    x: metricsX,
    y: metricsY,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.3),
  });
  metricsY -= 25;
  
  const metrics = [
    `LCP: ${formatMs(report.psi.cwv.lcp_ms)}`,
    `TTI: ${formatMs(report.psi.lighthouse.interactive)}`,
    `CLS: ${report.psi.cwv.cls?.toFixed(3) ?? '-'}`,
    `TBT: ${formatMs(report.psi.lighthouse.total_blocking_time)}`,
    `Requests: ${report.checks.page.requestCount ?? '-'}`,
    `Size: ${formatBytes(report.psi.audits.totalByteWeight)}`,
  ];
  
  for (const metric of metrics) {
    page.drawText(metric, {
      x: metricsX,
      y: metricsY,
      size: 11,
      font,
    });
    metricsY -= 18;
  }
  
  yPos = Math.min(yPos - scoreBoxHeight - 10, metricsY - 20);
  yPos -= 20;
  
  // === CORE WEB VITALS STATUS ===
  page.drawText('Core Web Vitals', {
    x: margin,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.3),
  });
  yPos -= 20;
  
  const cwvStatus = report.psi.cwv.status === 'pass' ? 'PASSING ✓' : 'FAILING ✗';
  const cwvColor = report.psi.cwv.status === 'pass' 
    ? rgb(0.2, 0.6, 0.2) 
    : rgb(0.8, 0.2, 0.2);
  
  page.drawText(cwvStatus, {
    x: margin,
    y: yPos,
    size: 12,
    font: boldFont,
    color: cwvColor,
  });
  yPos -= 25;
  
  // === TOP ISSUES ===
  page.drawText('Top Issues', {
    x: margin,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.3),
  });
  yPos -= 20;
  
  const topIssues = report.insights.slice(0, 5);
  for (const issue of topIssues) {
    const severityIcon = issue.severity === 'critical' ? '🔴' : 
                         issue.severity === 'high' ? '🟠' : 
                         issue.severity === 'medium' ? '🟡' : '⚪';
    
    const titleLines = wrapText(`${severityIcon} ${issue.title}`, contentWidth - 20, font, 11);
    for (const line of titleLines) {
      if (yPos < 100) {
        // Add new page if running out of space
        pdfDoc.addPage([612, 792]);
        yPos = height - 40;
      }
      page.drawText(line, {
        x: margin,
        y: yPos,
        size: 11,
        font,
      });
      yPos -= 14;
    }
    
    yPos -= 5;
  }
  
  yPos -= 15;
  
  // === BUSINESS IMPACT ===
  if (yPos < 150) {
    pdfDoc.addPage([612, 792]);
    yPos = height - 40;
  }
  
  page.drawText('Business Impact', {
    x: margin,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.3),
  });
  yPos -= 20;
  
  const impactLines = wrapText(report.businessImpact.headline, contentWidth, font, 11);
  for (const line of impactLines) {
    page.drawText(line, {
      x: margin,
      y: yPos,
      size: 11,
      font,
    });
    yPos -= 14;
  }
  yPos -= 10;
  
  page.drawText(`Potential Conversion Lift: ${report.businessImpact.estimatedRange.conversionLiftPct}`, {
    x: margin,
    y: yPos,
    size: 11,
    font: boldFont,
  });
  yPos -= 15;
  
  page.drawText(`Revenue Protection: ${report.businessImpact.estimatedRange.revenueProtection}`, {
    x: margin,
    y: yPos,
    size: 11,
    font,
  });
  yPos -= 25;
  
  // === RECOMMENDATIONS ===
  if (yPos < 150) {
    pdfDoc.addPage([612, 792]);
    yPos = height - 40;
  }
  
  page.drawText('Quick Wins', {
    x: margin,
    y: yPos,
    size: 14,
    font: boldFont,
    color: rgb(0.2, 0.2, 0.3),
  });
  yPos -= 20;
  
  const quickWins = report.recommendationSummary.quickWins.slice(0, 3);
  for (const win of quickWins) {
    const winLines = wrapText(`• ${win}`, contentWidth - 10, font, 11);
    for (const line of winLines) {
      page.drawText(line, {
        x: margin + 10,
        y: yPos,
        size: 11,
        font,
      });
      yPos -= 14;
    }
    yPos -= 5;
  }
  
  // === FOOTER ===
  const footerY = 30;
  page.drawText('Generated by whyismywebsiteslow.com', {
    x: margin,
    y: footerY,
    size: 9,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });
  
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function getGradeColor(grade: string): { r: number; g: number; b: number } {
  switch (grade) {
    case 'A': return rgb(0.2, 0.7, 0.3); // Green
    case 'B': return rgb(0.2, 0.5, 0.8); // Blue
    case 'C': return rgb(0.9, 0.7, 0.2); // Yellow
    case 'D': return rgb(0.9, 0.5, 0.2); // Orange
    case 'F': return rgb(0.8, 0.2, 0.2); // Red
    default: return rgb(0.5, 0.5, 0.5);
  }
}

function formatMs(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

function formatBytes(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  const mb = value / 1_000_000;
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${Math.round(value / 1000)} KB`;
}

function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}
