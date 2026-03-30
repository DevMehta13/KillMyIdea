/**
 * Pipeline route ownership verification.
 *
 * Every /api/pipeline/* route must verify that the analysis_run
 * belongs to the authenticated user's idea before processing.
 * This prevents any authenticated user from operating on another
 * user's analysis run (BUG-002, TASK_RULES rule 41).
 */

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Verify that an analysis run belongs to the given user.
 * Returns true if ownership is confirmed, false otherwise.
 *
 * Checks: analysis_runs → ideas → user_id === userId
 */
export async function verifyRunOwnership(
  runId: string,
  userId: string
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: run } = await admin
    .from('analysis_runs')
    .select('idea_id')
    .eq('id', runId)
    .single();

  if (!run) {
    logger.warn('Ownership check failed: run not found', {
      action: 'ownership_check',
      runId,
      userId,
    });
    return false;
  }

  const { data: idea } = await admin
    .from('ideas')
    .select('user_id')
    .eq('id', run.idea_id)
    .single();

  if (!idea || idea.user_id !== userId) {
    logger.warn('Ownership check failed: user does not own idea', {
      action: 'ownership_check',
      runId,
      userId,
      ideaOwner: idea?.user_id ?? 'unknown',
    });
    return false;
  }

  return true;
}
