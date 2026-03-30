/**
 * Weighted scorer — maps dimension insights to 0-10 scores.
 * Applies category weight adjustments and source affinity.
 *
 * SCORING LOGIC & RATIONALE:
 *
 * Raw score: signal_strength × 10 (0-10 scale)
 *   signal_strength comes from Step 4 (LLM-assigned, baseline-anchored).
 *   The ×10 scale matches the PRD's 0-10 scoring model.
 *
 * Missing dimensions: default to 5.0 score with 0.15 confidence
 *   5.0 = neutral (neither positive nor negative evidence).
 *   0.15 confidence = "we have almost no information about this."
 *   This prevents missing data from being either penalized or rewarded.
 *   The low confidence means it contributes very little to the overall score
 *   via the confidence-weighted average (see below).
 *
 * Overall score: 70% confidence-weighted + 30% simple-weighted
 *   RATIONALE for the 70/30 blend:
 *   - Pure confidence-weighted: gives zero influence to dimensions we know nothing
 *     about. This is too aggressive — a 9.0 score with 0.9 confidence on demand
 *     alone would produce an overall 9.0, ignoring that we have no data on 6 other
 *     dimensions.
 *   - Pure simple-weighted: treats confident and uncertain scores equally. A 5.0
 *     score with 0.15 confidence (no data) and a 5.0 score with 0.9 confidence
 *     (genuinely mediocre) would be the same.
 *   - 70/30 blend: confident dimensions dominate (70%), but missing/uncertain
 *     dimensions still pull toward neutral (30%), preventing overconfident scores
 *     when evidence is thin. This was calibrated to ensure that 4+ missing
 *     dimensions pull the overall below 7.5 (the Pursue threshold).
 *
 * Confidence-weighted effective weight: weight × (0.5 + 0.5 × confidence)
 *   At confidence=1.0: effective weight = weight × 1.0 (full influence)
 *   At confidence=0.5: effective weight = weight × 0.75 (3/4 influence)
 *   At confidence=0.0: effective weight = weight × 0.5 (half influence — floor)
 *   The 0.5 floor prevents any dimension from having zero influence even with
 *   no confidence, which keeps the score from being dominated by 1-2 dimensions.
 */

import type { AnalysisScores, DimensionScore, IdeaCategory } from '@/types/database';
import type { DimensionInsight } from '@/types/pipeline';
import { DEFAULT_SCORING_WEIGHTS, SCORING_DIMENSIONS } from '@/lib/constants';
import { getCategoryWeightAdjustments } from './category-weights';
import { getSourceAffinityMultiplier } from './source-affinity';

export function calculateScores(
  insights: DimensionInsight[],
  category: IdeaCategory
): { scores: AnalysisScores; overall_score: number } {
  const insightMap = new Map(insights.map((i) => [i.dimension, i]));
  const adjustments = getCategoryWeightAdjustments(category);
  const affinityMultiplier = getSourceAffinityMultiplier(category);

  const scores: Record<string, DimensionScore> = {};

  for (const dim of SCORING_DIMENSIONS) {
    const insight = insightMap.get(dim);
    const baseWeight = DEFAULT_SCORING_WEIGHTS[dim];
    const adjustment = adjustments[dim] ?? 0;
    const weight = Math.max(0, Math.min(1, baseWeight + adjustment));

    if (insight) {
      const rawScore = insight.signal_strength * 10;
      const confidence = Math.min(1, insight.confidence * affinityMultiplier);

      scores[dim] = {
        score: Math.round(rawScore * 10) / 10,
        weight: Math.round(weight * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        reasoning: insight.summary,
      };
    } else {
      // Missing dimension: neutral score, very low confidence
      scores[dim] = {
        score: 5.0,
        weight: Math.round(weight * 100) / 100,
        confidence: 0.15,
        reasoning: 'We didn\'t find enough evidence to evaluate this area. Consider providing more details about your idea.',
      };
    }
  }

  // ── Confidence-weighted overall score ───────────────────────────────────────
  let totalConfWeight = 0;
  let confWeightedSum = 0;
  let simpleWeightedSum = 0;
  let totalWeight = 0;

  for (const dim of SCORING_DIMENSIONS) {
    const s = scores[dim];
    // Effective weight includes a confidence factor with a 0.5 floor
    const effectiveWeight = s.weight * (0.5 + 0.5 * s.confidence);
    confWeightedSum += s.score * effectiveWeight;
    totalConfWeight += effectiveWeight;
    simpleWeightedSum += s.score * s.weight;
    totalWeight += s.weight;
  }

  // Blend: 70% confidence-weighted + 30% simple-weighted
  // See module-level documentation for rationale
  const confAvg = totalConfWeight > 0 ? confWeightedSum / totalConfWeight : 5;
  const simpleAvg = totalWeight > 0 ? simpleWeightedSum / totalWeight : 5;
  const overall = confAvg * 0.7 + simpleAvg * 0.3;

  return {
    scores: scores as unknown as AnalysisScores,
    overall_score: Math.round(overall * 100) / 100,
  };
}
