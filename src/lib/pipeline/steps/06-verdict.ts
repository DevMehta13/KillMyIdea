/**
 * Step 6: Verdict — determine verdict from score + apply logic overrides.
 * No LLM call. Pure deterministic logic.
 *
 * Passes total signal count to guardrails so Insufficient Data can trigger
 * when external evidence is too thin (< 3 signals).
 */

import type { Verdict } from '@/types/database';
import type { VerdictInput, VerdictOutput } from '@/types/pipeline';
import { VERDICT_THRESHOLDS } from '@/lib/constants';
import { applyLogicOverrides } from '@/lib/pipeline/scoring/logic-overrides';

function determineRawVerdict(overallScore: number): Verdict {
  for (const threshold of VERDICT_THRESHOLDS) {
    if (overallScore >= threshold.min) {
      return threshold.verdict;
    }
  }
  return 'drop';
}

export async function verdict(input: VerdictInput): Promise<VerdictOutput> {
  const rawVerdict = determineRawVerdict(input.overall_score);

  const overrideResult = applyLogicOverrides(
    rawVerdict,
    input.scores,
    input.overall_score,
    input.total_signal_count
  );

  return {
    verdict: overrideResult.verdict,
    raw_verdict: rawVerdict,
    override_applied: overrideResult.override_applied,
    override_reason: overrideResult.override_reason,
  };
}
