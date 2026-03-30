/**
 * Verdict logic guardrails — override the raw score-based verdict
 * when signal quality or evidence patterns warrant it.
 *
 * Rules are checked in priority order. First match wins.
 * This is intentional — rules higher in the list represent stronger
 * evidence concerns that should take precedence.
 *
 * RULE PRIORITY ORDER:
 *   1. Insufficient Data (too few signals or too many low-confidence dims)
 *   2. Low average confidence (evidence is thin across the board)
 *   3. High score + unclear distribution → Refine
 *   4. Drop + strong differentiation + demand → Refine
 *   5. Pursue + conflicting signals → Test First
 *   6. Pursue/Refine + zero demand evidence → Test First
 *
 * PRD Section 10 guardrails:
 *   - "A high overall score should not automatically mean Pursue if distribution
 *     is unrealistic or the idea remains unclear."
 *   - "Insufficient Data should be used when evidence or input quality is too
 *     weak for a responsible recommendation."
 *   - "Test First should be treated as a valid and positive outcome."
 */

import type { AnalysisScores, Verdict } from '@/types/database';
import { SCORING_DIMENSIONS } from '@/lib/constants';

export interface OverrideResult {
  verdict: Verdict;
  override_applied: string | null;
  override_reason: string | null;
}

/** Minimum total signal count to produce a confident verdict. */
const MIN_SIGNALS_FOR_VERDICT = 3;

/** Maximum low-confidence dimensions before triggering Insufficient Data. */
const LOW_CONFIDENCE_DIM_THRESHOLD = 3;

/** Confidence level below which a dimension is considered "low confidence". */
const LOW_CONFIDENCE_CUTOFF = 0.4;

/** Average confidence below which the entire analysis is considered weak. */
const WEAK_EVIDENCE_AVG_CONFIDENCE = 0.35;

export function applyLogicOverrides(
  rawVerdict: Verdict,
  scores: AnalysisScores,
  overallScore: number,
  totalSignalCount?: number
): OverrideResult {
  const s = scores as unknown as Record<string, { score: number; confidence: number; weight: number }>;

  // Count low-confidence dimensions
  const lowConfidenceCount = SCORING_DIMENSIONS.filter(
    (d) => s[d].confidence < LOW_CONFIDENCE_CUTOFF
  ).length;

  // Calculate average confidence across all dimensions
  const avgConfidence = SCORING_DIMENSIONS.reduce(
    (sum, d) => sum + s[d].confidence, 0
  ) / SCORING_DIMENSIONS.length;

  // ── Rule 1: Too few external signals → Insufficient Data ────────────────
  // If we collected fewer than 3 total signals, we don't have enough
  // external evidence to make any recommendation.
  if (totalSignalCount !== undefined && totalSignalCount < MIN_SIGNALS_FOR_VERDICT) {
    return {
      verdict: 'insufficient_data',
      override_applied: 'too_few_signals',
      override_reason: `Only ${totalSignalCount} external signals collected (minimum ${MIN_SIGNALS_FOR_VERDICT} required). Not enough evidence for a responsible recommendation.`,
    };
  }

  // ── Rule 2: Too many low-confidence dimensions → Insufficient Data ──────
  // If 3+ of 7 dimensions have low confidence, the analysis is unreliable.
  // (Lowered from 4 to 3 to catch more thin-evidence cases.)
  if (lowConfidenceCount >= LOW_CONFIDENCE_DIM_THRESHOLD) {
    return {
      verdict: 'insufficient_data',
      override_applied: 'low_confidence_dimensions',
      override_reason: `${lowConfidenceCount} of 7 dimensions have low confidence (below ${LOW_CONFIDENCE_CUTOFF}). Not enough evidence for a responsible recommendation.`,
    };
  }

  // ── Rule 3: Low average confidence → Insufficient Data ──────────────────
  // Even if no single dimension is terrible, if the AVERAGE confidence is
  // below 0.35, the overall picture is too uncertain.
  if (avgConfidence < WEAK_EVIDENCE_AVG_CONFIDENCE) {
    return {
      verdict: 'insufficient_data',
      override_applied: 'weak_overall_evidence',
      override_reason: `Average confidence across all dimensions is ${avgConfidence.toFixed(2)} (below ${WEAK_EVIDENCE_AVG_CONFIDENCE} threshold). Evidence is too thin for a confident verdict.`,
    };
  }

  // ── Rule 4: High score + unclear distribution → Refine ──────────────────
  // PRD: "A high overall score should not automatically mean Pursue if
  // distribution is unrealistic."
  if (
    rawVerdict === 'pursue' &&
    s.distribution.confidence < 0.5
  ) {
    return {
      verdict: 'refine',
      override_applied: 'high_score_unclear_distribution',
      override_reason: 'Overall score is high but distribution channel is unclear or unvalidated.',
    };
  }

  // ── Rule 5: Drop + strong differentiation + demand → Refine ─────────────
  // PRD: "A low overall score should not always mean Drop if the concept
  // shows promise but needs narrower positioning."
  if (
    rawVerdict === 'drop' &&
    s.differentiation.score >= 7 &&
    s.demand.score >= 5 &&
    s.demand.confidence >= 0.5
  ) {
    return {
      verdict: 'refine',
      override_applied: 'strong_differentiation_with_demand',
      override_reason: 'Score is low overall but the idea shows strong differentiation with real demand signals. Worth refining.',
    };
  }

  // ── Rule 6: Pursue + conflicting signals → Test First ───────────────────
  // Dimensions with extreme scores but low confidence indicate conflicting
  // or unreliable evidence. Don't give a "Pursue" verdict when key signals
  // are in conflict.
  const conflictingDimensions = SCORING_DIMENSIONS.filter((d) => {
    const score = s[d].score;
    const conf = s[d].confidence;
    return (score >= 7 && conf < 0.5) || (score <= 3 && conf < 0.5);
  });
  if (rawVerdict === 'pursue' && conflictingDimensions.length >= 3) {
    return {
      verdict: 'test_first',
      override_applied: 'conflicting_signals_pursue',
      override_reason: `${conflictingDimensions.length} dimensions have conflicting or uncertain signals. Test the key assumptions before committing.`,
    };
  }

  // ── Rule 7: Pursue/Refine + zero demand evidence → Test First ───────────
  // PRD: demand is the highest-weighted dimension (20%). If we have no
  // confidence in demand, no positive verdict is responsible.
  if (
    (rawVerdict === 'pursue' || rawVerdict === 'refine') &&
    s.demand.confidence < 0.3
  ) {
    return {
      verdict: 'test_first',
      override_applied: 'zero_demand_evidence',
      override_reason: 'No strong evidence of market demand found. Validate demand before investing further.',
    };
  }

  // No override — raw verdict stands
  return { verdict: rawVerdict, override_applied: null, override_reason: null };
}
