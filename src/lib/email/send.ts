/**
 * Email send functions (DEC-030).
 * All sends are fire-and-forget — failures never block the pipeline.
 */

import type { Verdict } from '@/types/database';
import { getEmailClient } from './client';
import { buildAnalysisCompleteEmail } from './templates/analysis-complete';
import { logger } from '@/lib/logger';

/**
 * Send analysis complete notification email.
 * Gracefully degrades if email client is not configured or send fails.
 */
export async function sendAnalysisCompleteEmail(params: {
  to: string;
  userName: string;
  ideaTitle: string;
  verdict: Verdict;
  score: number;
  reportUrl: string;
}): Promise<void> {
  try {
    const client = getEmailClient();
    if (!client) {
      logger.info('Resend not configured, skipping analysis-complete email', { action: 'send_email' });
      return;
    }

    const { subject, html } = buildAnalysisCompleteEmail(params);

    await client.emails.send({
      from: 'Kill My Idea <noreply@killmyidea.com>',
      to: params.to,
      subject,
      html,
    });

    logger.info('Analysis complete email sent', { action: 'send_email', to: params.to });
  } catch (e) {
    // Never throw — email failure must not block the pipeline
    logger.warn('Failed to send analysis-complete email', { action: 'send_email', error: (e as Error).message });
  }
}
