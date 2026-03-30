/**
 * Resend email client wrapper (DEC-030).
 * Free tier: 100 emails/day, 3,000/month.
 * Returns null if RESEND_API_KEY not configured.
 */

import { Resend } from 'resend';

let resendInstance: Resend | null = null;

export function getEmailClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}
