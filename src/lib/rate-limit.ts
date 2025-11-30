// ==========================================
// Rate Limiting Utility
// In-memory rate limiter with sliding window
// ==========================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis for production scaling)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  // Maximum requests allowed in the window
  limit: number;
  // Window size in seconds
  windowSec: number;
}

// Preset configurations for different endpoint types
export const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  auth: { limit: 5, windowSec: 60 } as RateLimitConfig,
  // Generation endpoints - moderate limits per user
  generation: { limit: 20, windowSec: 60 } as RateLimitConfig,
  // Read-only endpoints - more generous
  read: { limit: 100, windowSec: 60 } as RateLimitConfig,
  // Webhook endpoints - stricter to prevent abuse
  webhook: { limit: 50, windowSec: 60 } as RateLimitConfig,
  // Payment endpoints - moderate
  payment: { limit: 10, windowSec: 60 } as RateLimitConfig,
} as const;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (userId, IP, etc.)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with success status and metadata
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSec * 1000;
  const key = `${identifier}:${config.limit}:${config.windowSec}`;

  const entry = rateLimitStore.get(key);

  // No existing entry or window has expired
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: config.windowSec,
    };
  }

  // Window is still active
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment counter
  entry.count += 1;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Create a rate limit key from request context
 */
export function getRateLimitKey(
  userId?: string,
  ip?: string,
  endpoint?: string
): string {
  const parts = [endpoint || 'default'];
  if (userId) {
    parts.push(`user:${userId}`);
  } else if (ip) {
    parts.push(`ip:${ip}`);
  } else {
    parts.push('anonymous');
  }
  return parts.join(':');
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Check various headers for IP
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetIn.toString(),
  };
}
