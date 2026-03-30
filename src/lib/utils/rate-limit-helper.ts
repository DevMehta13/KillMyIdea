/**
 * Rate limit helper — reduces boilerplate for applying rate limits to API routes (DEC-034).
 * Wraps checkUserRateLimit / checkIpRateLimit with standardized 429 response.
 */

import { NextResponse } from 'next/server';
import { checkUserRateLimit, checkIpRateLimit } from '@/lib/pipeline/ai/rate-limiter';

type RateLimitTier = { maxRequests: number; windowMs: number };

/**
 * Apply per-user rate limiting. Returns a 429 NextResponse if limit exceeded, null if allowed.
 */
export async function applyUserRateLimit(
  userId: string,
  action: string,
  tier: RateLimitTier
): Promise<NextResponse | null> {
  const result = await checkUserRateLimit(userId, action, tier.maxRequests, tier.windowMs);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Try again later.', retryAfter: result.retryAfter },
      { status: 429 }
    );
  }
  return null;
}

/**
 * Apply per-IP rate limiting. Returns a 429 NextResponse if limit exceeded, null if allowed.
 */
export async function applyIpRateLimit(
  ip: string,
  action: string,
  tier: RateLimitTier
): Promise<NextResponse | null> {
  const result = await checkIpRateLimit(ip, tier.maxRequests, tier.windowMs);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests. Try again later.', retryAfter: result.retryAfter },
      { status: 429 }
    );
  }
  return null;
}
