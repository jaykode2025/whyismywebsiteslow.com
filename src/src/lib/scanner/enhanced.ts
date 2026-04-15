// src/lib/scanner/enhanced.ts
import type { APIRoute } from 'astro';

export interface RumData {
  lcp_ms?: number;
  inp_ms?: number;
  cls?: number;
  fcp_ms?: number;
  ttfb_ms?: number;
  status: 'pass' | 'needs-improvement' | 'poor';
  sampleSize: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface LabData {
  lighthouse: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  cwv: {
    lcp_ms?: number;
    inp_ms?: number;
    cls?: number;
    status: 'pass' | 'needs-improvement' | 'poor';
  };
}

export interface NetworkData {
  ttfb_ms: number;
  dns_ms?: number;
  tls_ms?: number;
  redirect_count: number;
  redirect_time_ms: number;
}

export interface EnhancedScanResult {
  rum: RumData;
  lab: LabData;
  network: NetworkData;
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sources: {
    rumAvailable: boolean;
    labAvailable: boolean;
    networkAvailable: boolean;
  };
  confidence: 'high' | 'medium' | 'low';
}

const CRUX_API_URL = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';
const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

async function fetchCrux(origin: string, formFactor: 'PHONE' | 'DESKTOP' = 'PHONE'): Promise<RumData | null> {
  try {
    const response = await fetch(`\( {CRUX_API_URL}?key= \){import.meta.env.CRUX_API_KEY || ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        formFactor,
        metrics: [
          'largest_contentful_paint',
          'interaction_to_next_paint',
          'cumulative_layout_shift',
          'first_contentful_paint',
          'experimental_time_to_first_byte'
        ]
      })
    });

    if (!response.ok) return null;

    const data = await response.json();
    const record = data.record;

    if (!record?.metrics) return null;

    const metrics = record.metrics;
    const sampleSize = record.metrics.largest_contentful_paint?.histogram?.[0]?.density || 0;

    const lcp = metrics.largest_contentful_paint?.percentiles?.p75;
    const inp = metrics.interaction_to_next_paint?.percentiles?.p75;
    const cls = metrics.cumulative_layout_shift?.percentiles?.p75;
    const fcp = metrics.first_contentful_paint?.percentiles?.p75;
    const ttfb = metrics.experimental_time_to_first_byte?.percentiles?.p75;

    const confidence = sampleSize > 5000 ? 'high' : sampleSize > 1000 ? 'medium' : 'low';

    return {
      lcp_ms: lcp,
      inp_ms: inp,
      cls,
      fcp_ms: fcp,
      ttfb_ms: ttfb,
      status: getCwvStatus(lcp, inp, cls),
      sampleSize: Math.floor(sampleSize * 10000),
      confidence
    };
  } catch {
    return null;
  }
}

function getCwvStatus(lcp?: number, inp?: number, cls?: number): 'pass' | 'needs-improvement' | 'poor' {
  if (!lcp || !inp || !cls) return 'needs-improvement';
  if (lcp <= 2500 && inp <= 200 && cls <= 0.1) return 'pass';
  if (lcp <= 4000 && inp <= 500 && cls <= 0.25) return 'needs-improvement';
  return 'poor';
}

async function fetchPsi(url: string, device: 'mobile' | 'desktop' = 'mobile'): Promise<LabData | null> {
  try {
    const strategy = device === 'mobile' ? 'mobile' : 'desktop';
    const params = new URLSearchParams({
      url,
      strategy,
      category: ['performance', 'accessibility', 'best-practices', 'seo']
    });

    const response = await fetch(`\( {PSI_API_URL}? \){params}`);
    if (!response.ok) return null;

    const data = await response.json();
    const lighthouse = data.lighthouseResult;

    return {
      lighthouse: {
        performance: lighthouse.categories.performance.score || 0,
        accessibility: lighthouse.categories.accessibility.score || 0,
        bestPractices: lighthouse.categories['best-practices'].score || 0,
        seo: lighthouse.categories.seo.score || 0
      },
      cwv: {
        lcp_ms: lighthouse.audits['largest-contentful-paint']?.numericValue,
        inp_ms: lighthouse.audits['interaction-to-next-paint']?.numericValue,
        cls: lighthouse.audits['cumulative-layout-shift']?.numericValue,
        status: getCwvStatus(
          lighthouse.audits['largest-contentful-paint']?.numericValue,
          lighthouse.audits['interaction-to-next-paint']?.numericValue,
          lighthouse.audits['cumulative-layout-shift']?.numericValue
        )
      }
    };
  } catch {
    return null;
  }
}

async function measureNetwork(url: string): Promise<NetworkData> {
  const start = Date.now();
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const ttfb = Date.now() - start;

    return {
      ttfb_ms: ttfb,
      dns_ms: 0,
      tls_ms: 0,
      redirect_count: response.redirected ? 1 : 0,
      redirect_time_ms: 0
    };
  } catch {
    return {
      ttfb_ms: 9999,
      redirect_count: 0,
      redirect_time_ms: 0
    };
  }
}

function calculateOverallScore(rum: RumData | null, lab: LabData | null, network: NetworkData): number {
  let score = 70;

  if (lab) {
    score = (score * 0.4) + (lab.lighthouse.performance * 100 * 0.4);
  }

  if (rum) {
    const rumScore = 100 - ((rum.lcp_ms || 3000) / 40) - ((rum.inp_ms || 300) / 5) - (rum.cls || 0) * 200;
    score = (score * 0.6) + (Math.max(0, rumScore) * 0.6);
  }

  if (network.ttfb_ms > 600) score -= 15;
  if (network.ttfb_ms > 1000) score -= 20;

  return Math.min(100, Math.max(0, Math.round(score)));
}

function getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export async function runEnhancedScanner(url: string, device: 'mobile' | 'desktop' = 'mobile'): Promise<EnhancedScanResult> {
  const origin = new URL(url).origin;

  const [rum, lab, network] = await Promise.all([
    fetchCrux(origin, device === 'mobile' ? 'PHONE' : 'DESKTOP'),
    fetchPsi(url, device),
    measureNetwork(url)
  ]);

  const overallScore = calculateOverallScore(rum, lab, network);
  const grade = getGrade(overallScore);

  const rumAvailable = !!rum;
  const labAvailable = !!lab;
  const networkAvailable = true;

  const confidence = rum?.confidence || (labAvailable ? 'medium' : 'low');

  return {
    rum: rum || {
      lcp_ms: undefined,
      inp_ms: undefined,
      cls: undefined,
      status: 'needs-improvement',
      sampleSize: 0,
      confidence: 'low'
    },
    lab: lab || {
      lighthouse: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
      cwv: { status: 'needs-improvement' }
    },
    network,
    overallScore,
    grade,
    sources: { rumAvailable, labAvailable, networkAvailable },
    confidence
  };
}