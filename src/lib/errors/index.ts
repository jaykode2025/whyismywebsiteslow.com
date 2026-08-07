/**
 * Standardized error classes for API routes
 */

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number = 500,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toJSON() {
    const result: Record<string, unknown> = {
      error: this.message,
    };
    if (this.code) result.code = this.code;
    if (this.details) result.details = this.details;
    return result;
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request', code?: string, details?: Record<string, unknown>) {
    super(message, 400, code, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', code?: string, details?: Record<string, unknown>) {
    super(message, 401, code, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', code?: string, details?: Record<string, unknown>) {
    super(message, 403, code, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not found', code?: string, details?: Record<string, unknown>) {
    super(message, 404, code, details);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends ApiError {
  public readonly retryAfter: number;
  public readonly resetAt: number;
  public readonly remaining: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter: number = 60,
    resetAt: number = Date.now() + 60000,
    remaining: number = 0
  ) {
    super(message, 429, 'rate_limit_exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.resetAt = resetAt;
    this.remaining = remaining;
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      retryAfter: this.retryAfter,
    };
  }

  getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Retry-After': this.retryAfter.toString(),
      'X-RateLimit-Remaining': this.remaining.toString(),
      'X-RateLimit-Reset': this.resetAt.toString(),
    };
  }
}

export class PaymentRequiredError extends ApiError {
  constructor(
    message: string,
    code?: string,
    plan?: string,
    limit?: number
  ) {
    super(message, 402, code, { plan, limit });
    this.name = 'PaymentRequiredError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', code?: string, details?: Record<string, unknown>) {
    super(message, 409, code, details);
    this.name = 'ConflictError';
  }
}

export class InternalError extends ApiError {
  constructor(message: string = 'Internal error', details?: Record<string, unknown>) {
    super(message, 500, 'internal_error', details);
    this.name = 'InternalError';
  }
}

/**
 * Helper to create standardized error responses
 */
export function createErrorResponse(error: unknown): { status: number; body: string; headers: Record<string, string> } {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: JSON.stringify(error.toJSON()),
      headers: error instanceof RateLimitError ? error.getHeaders() : { 'Content-Type': 'application/json' },
    };
  }

  // Handle rate limit bucket errors
  if (error && typeof error === 'object' && 'ok' in error && !error.ok) {
    const err = error as { ok: false; resetAt: number; remaining?: number };
    const retryAfter = Math.max(1, Math.ceil((err.resetAt - Date.now()) / 1000));
    return {
      status: 429,
      body: JSON.stringify({ error: 'Rate limit exceeded', code: 'rate_limit_exceeded' }),
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': (err.remaining ?? 0).toString(),
        'X-RateLimit-Reset': err.resetAt.toString(),
      },
    };
  }

  // Unknown error - log and return generic 500
  console.error('Unhandled API error:', error);
  return {
    status: 500,
    body: JSON.stringify({ error: 'Internal error' }),
    headers: { 'Content-Type': 'application/json' },
  };
}
