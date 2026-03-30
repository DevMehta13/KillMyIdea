/**
 * Pipeline orchestrator — coordinates the 7-step analysis pipeline.
 * Each step updates the analysis_run status in the DB.
 * Used by individual API route handlers (client-driven sequential, DEC-009).
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { AnalysisRunStatus } from '@/types/database';
import { logger } from '@/lib/logger';

/**
 * Update the status and current_step of an analysis run.
 */
export async function updateRunStatus(
  runId: string,
  status: AnalysisRunStatus,
  step: number | null = null,
  extra: Record<string, unknown> = {}
) {
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { status, current_step: step, ...extra };

  if (status === 'completed') {
    update.completed_at = new Date().toISOString();
  }
  if (step === 1 && !extra.started_at) {
    update.started_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('analysis_runs')
    .update(update)
    .eq('id', runId);

  if (error) {
    logger.error(`Failed to update run ${runId} to ${status}`, error, { action: 'update_run_status', runId });
    throw new Error(`Failed to update analysis run status: ${error.message}`);
  }
}

/**
 * Mark a run as failed with an error message.
 */
export async function failRun(runId: string, errorMessage: string) {
  const supabase = createAdminClient();
  await supabase
    .from('analysis_runs')
    .update({
      status: 'failed',
      error: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

/**
 * Get the current analysis run data.
 */
export async function getRunData(runId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('analysis_runs')
    .select('*')
    .eq('id', runId)
    .single();

  if (error || !data) {
    throw new Error(`Analysis run not found: ${runId}`);
  }
  return data;
}

/**
 * Mark a pipeline step as completed (DEC-024).
 * Appends the step number to the completed_steps array.
 */
export async function markStepCompleted(runId: string, step: number) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('analysis_runs')
    .select('completed_steps')
    .eq('id', runId)
    .single();

  const current: number[] = (data?.completed_steps as number[]) ?? [];
  if (!current.includes(step)) {
    current.push(step);
    current.sort((a, b) => a - b);
  }

  await supabase
    .from('analysis_runs')
    .update({ completed_steps: current })
    .eq('id', runId);
}

/**
 * Get completed steps for a run (DEC-024).
 */
export async function getCompletedSteps(runId: string): Promise<number[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('analysis_runs')
    .select('completed_steps')
    .eq('id', runId)
    .single();

  return (data?.completed_steps as number[]) ?? [];
}
