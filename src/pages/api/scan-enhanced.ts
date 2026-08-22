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
import { normalizeUrl } from '../../lib/validate';
import { verifyCsrfTokenFromRequest } from '../../lib/csrf';
import { rateLimit } from '../../lib/slidingRateLimit';

interface ScanRequest {
  url?: unknown;
  device?: unknown;
}

function isValidDevice(value: unknown): value is Device {
  return value === 'mobile' || value === 'desktop';
}

export const POST: APIRoute = async (context) => {
  const { request, clientAddress } = context;

  const csrfValid = await verifyCsrfTokenFromRequest(request);
  if (!csrfValid) {
    return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as ScanRequest;

    // Validate URL and block SSRF targets (localhost, private ranges, cloud metadata, etc).
    let normalized: URL;
    try {
      normalized = normalizeUrl(typeof body.url === 'string' ? body.url : '');
    } catch (err: any) {
      return new Response(
        JSON.stringify({ error: err?.message || 'Invalid or missing URL. Must be a valid http(s) URL.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const bucket = rateLimit(`${clientAddress ?? 'unknown'}:${normalized.hostname}`);
    if (!bucket.ok) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
        },
      });
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
    const result = await runEnhancedScanner(normalized.toString(), device, apiKey);

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
