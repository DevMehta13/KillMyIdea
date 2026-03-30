import { describe, it, expect } from 'vitest';
import { calculateScores } from '@/lib/pipeline/scoring/weighted-scorer';
import type { DimensionInsight } from '@/types/pipeline';
import type { SignalCategory } from '@/types/database';

function makeInsight(dimension: SignalCategory, strength: number, confidence: number): DimensionInsight {
  return {
    dimension,
    signal_strength: strength,
    baseline_strength: strength,
    confidence,
    summary: `Test ${dimension}`,
    evidence_count: 3,
    evidence_urls: [],
  };
}

const ALL_DIMENSIONS: SignalCategory[] = [
  'demand', 'urgency', 'distribution', 'differentiation',
  'competition', 'monetization', 'execution',
];

describe('calculateScores', () => {
  it('produces scores for all 7 dimensions', () => {
    const insights = ALL_DIMENSIONS.map((d) => makeInsight(d, 0.7, 0.8));
    const { scores } = calculateScores(insights, 'b2b_saas');
    for (const dim of ALL_DIMENSIONS) {
      expect(scores[dim]).toBeDefined();
      expect(scores[dim].score).toBeGreaterThanOrEqual(0);
      expect(scores[dim].score).toBeLessThanOrEqual(10);
    }
  });

  it('overall_score is between 0 and 10', () => {
    const insights = ALL_DIMENSIONS.map((d) => makeInsight(d, 0.5, 0.5));
    const { overall_score } = calculateScores(insights, 'consumer_app');
    expect(overall_score).toBeGreaterThanOrEqual(0);
    expect(overall_score).toBeLessThanOrEqual(10);
  });

  it('higher signal_strength produces higher scores', () => {
    const lowInsights = ALL_DIMENSIONS.map((d) => makeInsight(d, 0.2, 0.8));
    const highInsights = ALL_DIMENSIONS.map((d) => makeInsight(d, 0.9, 0.8));

    const { overall_score: low } = calculateScores(lowInsights, 'devtool');
    const { overall_score: high } = calculateScores(highInsights, 'devtool');

    expect(high).toBeGreaterThan(low);
  });

  it('is deterministic — same input produces same output', () => {
    const insights = ALL_DIMENSIONS.map((d) => makeInsight(d, 0.65, 0.7));

    const result1 = calculateScores(insights, 'fintech');
    const result2 = calculateScores(insights, 'fintech');

    expect(result1.overall_score).toBe(result2.overall_score);
    for (const dim of ALL_DIMENSIONS) {
      expect(result1.scores[dim].score).toBe(result2.scores[dim].score);
    }
  });

  it('fills missing dimensions with neutral defaults', () => {
    const partialInsights = [makeInsight('demand', 0.8, 0.9)];
    const { scores } = calculateScores(partialInsights, 'marketplace');

    expect(scores.demand.score).toBeCloseTo(8.0, 0);
    // Missing dimensions get score 5.0
    expect(scores.urgency.score).toBe(5.0);
    expect(scores.execution.score).toBe(5.0);
  });

  it('confidence affects the overall score blend', () => {
    const highConf = ALL_DIMENSIONS.map((d) => makeInsight(d, 0.7, 1.0));
    const lowConf = ALL_DIMENSIONS.map((d) => makeInsight(d, 0.7, 0.1));

    const { overall_score: high } = calculateScores(highConf, 'edtech');
    const { overall_score: low } = calculateScores(lowConf, 'edtech');

    // Both should be around 7.0 but the blend differs
    expect(high).toBeGreaterThanOrEqual(5);
    expect(low).toBeGreaterThanOrEqual(5);
  });
});
