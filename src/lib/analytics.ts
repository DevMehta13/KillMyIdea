/**
 * Analytics event tracking wrapper (DEC-038).
 * Uses Vercel Analytics track() for custom events.
 * Client-side only — import this in 'use client' components.
 */

import { track } from '@vercel/analytics';

type AnalyticsEvent =
  | { name: 'signup_completed' }
  | { name: 'analysis_started'; props: { ideaId: string } }
  | { name: 'analysis_completed'; props: { ideaId: string; verdict: string; score: number } }
  | { name: 'quick_roast_used' }
  | { name: 'credit_purchased'; props: { packageId: string; credits: number } }
  | { name: 'report_shared'; props: { ideaId: string } }
  | { name: 'pdf_exported'; props: { ideaId: string } };

/**
 * Track a typed analytics event.
 * No-ops silently if analytics is not available.
 */
export function trackEvent(event: AnalyticsEvent) {
  try {
    if ('props' in event) {
      track(event.name, event.props);
    } else {
      track(event.name);
    }
  } catch {
    // Analytics should never break the app
  }
}
