/**
 * DB-backed rate limiter — survives across serverless invocations.
 * Uses Supabase admin_settings table to track request counts.
 * Falls back to in-memory for Quick Roast IP limiting (simpler, acceptable for v1).
 */

import { createAdminClient } from '@/lib/supabase/server';

interface RateLimitEntry {
  count: number;
  window_start: string;
}

/**
 * Check and increment rate limit for an IP address.
 * Returns { allowed: boolean, retryAfter?: number }
 */
export async function checkIpRateLimit(
  ip: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabase = createAdminClient();
  const key = `rate_limit:${ip}`;
  const now = Date.now();

  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .single();

  const entry = data?.value as RateLimitEntry | null;

  // No entry or window expired — allow and start new window
  if (!entry || now - new Date(entry.window_start).getTime() > windowMs) {
    await supabase
      .from('admin_settings')
      .upsert({
        key,
        value: { count: 1, window_start: new Date(now).toISOString() } satisfies RateLimitEntry,
      });
    return { allowed: true };
  }

  // Within window — check count
  if (entry.count >= maxRequests) {
    const windowEnd = new Date(entry.window_start).getTime() + windowMs;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment
  await supabase
    .from('admin_settings')
    .update({
      value: { count: entry.count + 1, window_start: entry.window_start } satisfies RateLimitEntry,
    })
    .eq('key', key);

  return { allowed: true };
}

/**
 * Check and increment rate limit for an authenticated user (DEC-029).
 * Same DB-backed pattern as IP rate limiting.
 * Returns { allowed: boolean, retryAfter?: number }
 */
export async function checkUserRateLimit(
  userId: string,
  action: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const supabase = createAdminClient();
  const key = `user_rate:${userId}:${action}`;
  const now = Date.now();

  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .single();

  const entry = data?.value as RateLimitEntry | null;

  if (!entry || now - new Date(entry.window_start).getTime() > windowMs) {
    await supabase
      .from('admin_settings')
      .upsert({
        key,
        value: { count: 1, window_start: new Date(now).toISOString() } satisfies RateLimitEntry,
      });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const windowEnd = new Date(entry.window_start).getTime() + windowMs;
    const retryAfter = Math.ceil((windowEnd - now) / 1000);
    return { allowed: false, retryAfter };
  }

  await supabase
    .from('admin_settings')
    .update({
      value: { count: entry.count + 1, window_start: entry.window_start } satisfies RateLimitEntry,
    })
    .eq('key', key);

  return { allowed: true };
}
