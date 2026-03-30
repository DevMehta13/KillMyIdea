/**
 * Step 5: Score — deterministic weighted scoring of dimension insights.
 * No LLM call. Pure computation.
 */

import type { ScoreInput, ScoreOutput } from '@/types/pipeline';
import { calculateScores } from '@/lib/pipeline/scoring/weighted-scorer';

export async function score(input: ScoreInput): Promise<ScoreOutput> {
  try {
    const { scores, overall_score } = calculateScores(input.dimension_insights, input.category);
    return { scores, overall_score };
  } catch (error) {
    throw new Error(
      `[Step 5: Score] Scoring calculation failed: ${(error as Error).message}`
    );
  }
}
