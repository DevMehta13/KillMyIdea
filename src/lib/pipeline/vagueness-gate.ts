/**
 * Vagueness gate — enforces vagueness threshold before signal collection (DEC-021).
 * If vagueness_score >= threshold, pipeline blocks and requires clarification.
 */

import { VAGUENESS_BLOCK_THRESHOLD } from '@/lib/constants';
import type { VaguenessGateResult } from '@/types/pipeline';

/**
 * Check whether the idea is too vague to proceed to signal collection.
 *
 * @param vagueness_score - Score from Step 1 (0.0 = crystal clear, 1.0 = extremely vague)
 * @param vagueness_flags - Specific vagueness indicators from Step 1
 * @returns Gate result indicating whether pipeline should be blocked
 */
export function checkVaguenessGate(
  vagueness_score: number,
  vagueness_flags: string[] = []
): VaguenessGateResult {
  return {
    blocked: vagueness_score >= VAGUENESS_BLOCK_THRESHOLD,
    vagueness_score,
    threshold: VAGUENESS_BLOCK_THRESHOLD,
    vagueness_flags,
  };
}
