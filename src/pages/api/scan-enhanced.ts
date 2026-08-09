/**
 * Enhanced Scanner API Endpoint
 * 
 * POST /api/scan-enhanced
 * 
 * Securely runs the enhanced scanner on the server.
 * API keys are kept in environment variables and never exposed to clients.
 * 
 * Request body:
 * {
 *   "url": "https://example.com",
 *   "device": "mobile" | "desktop"
 * }
 * 
 * Response:
 * {
 *   "rum": {...},
 *   "lab": {...},
 *   "network": {...},
 *   "overallScore": number,
 *   "grade": "A" | "B" | "C" | "D" | "F",
 *   "sources": {...},
 *   "confidence": "high" | "medium" | "low"
 * }
 */

import type { APIRoute } from 'astro';
import { env } from '../../lib/env';
import { runEnhancedScanner } from '../../lib/scanner/server';
import type { Device } from '../../lib/scanner/enhanced';

interface ScanRequest {
  url?: unknown;
  device?: unknown;
}

function isValidUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidDevice(value: unknown): value is Device {
  return value === 'mobile' || value === 'desktop';
}

export const POST: APIRoute = async (context) => {
  try {
    const body = (await context.request.json().catch(() => ({}))) as ScanRequest;

    // Validate URL
    if (!isValidUrl(body.url)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing URL. Must be a valid http(s) URL.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate device
    const device: Device = isValidDevice(body.device) ? body.device : 'mobile';

    // Get API key from environment (never exposed to client)
    const apiKey = env.PSI_API_KEY?.() || env.GOOGLE_API_KEY?.();
    if (!apiKey) {
      console.error('PSI API key not configured');
      return new Response(
        JSON.stringify({
          error: 'Scanner not configured. Please check server logs.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Run the enhanced scanner
    const result = await runEnhancedScanner(body.url, device, apiKey);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Scanner error:', error);
    return new Response(
      JSON.stringify({
        error: 'Scanner failed. Please try again later.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
