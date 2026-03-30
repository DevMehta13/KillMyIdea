/**
 * Category preservation utility (DEC-025, implements DEC-016).
 * On rerun of an unchanged idea, reuse previous category.
 * On material edit (title, raw_input, problem_statement), allow reclassification.
 */

import type { IdeaCategory } from '@/types/database';
import { createAdminClient } from '@/lib/supabase/server';

interface IdeaFields {
  title: string;
  raw_input: string;
  problem_statement: string | null;
}

/**
 * Check if an idea has materially changed since its last completed analysis.
 * Returns the previous category if unchanged, null if changed or no prior run.
 */
export async function getPreservedCategory(
  ideaId: string,
  current: IdeaFields
): Promise<IdeaCategory | null> {
  const admin = createAdminClient();

  // Find the most recent completed analysis run for this idea
  const { data: previousRun } = await admin
    .from('analysis_runs')
    .select('input_snapshot')
    .eq('idea_id', ideaId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!previousRun?.input_snapshot) {
    return null; // No previous run — classify fresh
  }

  const snapshot = previousRun.input_snapshot as Record<string, unknown>;
  const prevCategory = snapshot.category as IdeaCategory | undefined;

  if (!prevCategory) {
    return null; // Previous run has no category — classify fresh
  }

  // Compare material fields
  const prevTitle = (snapshot.title as string) ?? '';
  const prevRawInput = (snapshot.raw_input as string) ?? '';
  const prevProblem = (snapshot.problem_statement as string | null) ?? null;

  const isUnchanged =
    current.title === prevTitle &&
    current.raw_input === prevRawInput &&
    (current.problem_statement ?? null) === (prevProblem ?? null);

  if (isUnchanged) {
    return prevCategory; // Idea unchanged — preserve category
  }

  return null; // Idea changed — reclassify
}
