import { describe, it, expect } from 'vitest';
import { computeEvidenceBaselines } from '@/lib/pipeline/scoring/evidence-quantifier';
import type { SignalResult } from '@/types/pipeline';

function makeSignal(sourceType: string, category: string, data: Record<string, unknown> = {}): SignalResult {
  return {
    source_type: sourceType,
    signal_category: category as SignalResult['signal_category'],
    raw_data: data,
    normalized_summary: 'Test signal',
    source_url: sourceType !== 'llm_knowledge' ? 'https://example.com' : null,
  };
}

describe('computeEvidenceBaselines', () => {
  it('returns baselines for all 7 dimensions', () => {
    const baselines = computeEvidenceBaselines([]);
    expect(baselines).toHaveLength(7);
    const dims = baselines.map((b) => b.dimension);
    expect(dims).toContain('demand');
    expect(dims).toContain('urgency');
    expect(dims).toContain('execution');
  });

  it('returns 0.4 baseline for dimensions with no signals', () => {
    const baselines = computeEvidenceBaselines([]);
    for (const b of baselines) {
      expect(b.baseline_strength).toBe(0.35);
      expect(b.contributing_signals).toBe(0);
      expect(b.has_real_urls).toBe(false);
    }
  });

  it('produces higher baselines for high-engagement HN signals', () => {
    const lowEngagement = [makeSignal('hackernews', 'demand', { points: 3, num_comments: 1 })];
    const highEngagement = [makeSignal('hackernews', 'demand', { points: 150, num_comments: 60 })];

    const lowBaselines = computeEvidenceBaselines(lowEngagement);
    const highBaselines = computeEvidenceBaselines(highEngagement);

    const lowDemand = lowBaselines.find((b) => b.dimension === 'demand')!;
    const highDemand = highBaselines.find((b) => b.dimension === 'demand')!;

    expect(highDemand.baseline_strength).toBeGreaterThan(lowDemand.baseline_strength);
  });

  it('produces higher baselines for top-position Serper results', () => {
    const topResult = [makeSignal('serper', 'competition', { position: 1 })];
    const lowResult = [makeSignal('serper', 'competition', { position: 8 })];

    const topBaselines = computeEvidenceBaselines(topResult);
    const lowBaselines = computeEvidenceBaselines(lowResult);

    const topComp = topBaselines.find((b) => b.dimension === 'competition')!;
    const lowComp = lowBaselines.find((b) => b.dimension === 'competition')!;

    expect(topComp.baseline_strength).toBeGreaterThan(lowComp.baseline_strength);
  });

  it('gives diversity bonus for multi-source signals', () => {
    const singleSource = [
      makeSignal('hackernews', 'demand', { points: 20 }),
      makeSignal('hackernews', 'demand', { points: 15 }),
    ];
    const multiSource = [
      makeSignal('hackernews', 'demand', { points: 20 }),
      makeSignal('serper', 'demand', { position: 3 }),
    ];

    const singleBaselines = computeEvidenceBaselines(singleSource);
    const multiBaselines = computeEvidenceBaselines(multiSource);

    const singleDemand = singleBaselines.find((b) => b.dimension === 'demand')!;
    const multiDemand = multiBaselines.find((b) => b.dimension === 'demand')!;

    expect(multiDemand.signal_sources.length).toBeGreaterThan(singleDemand.signal_sources.length);
  });

  it('tracks has_real_urls correctly', () => {
    const withUrls = [makeSignal('serper', 'demand', { position: 1 })];
    const withoutUrls = [makeSignal('llm_knowledge', 'demand')];

    const urlBaselines = computeEvidenceBaselines(withUrls);
    const noUrlBaselines = computeEvidenceBaselines(withoutUrls);

    expect(urlBaselines.find((b) => b.dimension === 'demand')!.has_real_urls).toBe(true);
    expect(noUrlBaselines.find((b) => b.dimension === 'demand')!.has_real_urls).toBe(false);
  });

  it('baselines are clamped between 0 and 1', () => {
    const manySignals = Array.from({ length: 20 }, () =>
      makeSignal('hackernews', 'demand', { points: 200, num_comments: 100 })
    );
    const baselines = computeEvidenceBaselines(manySignals);
    const demand = baselines.find((b) => b.dimension === 'demand')!;
    expect(demand.baseline_strength).toBeLessThanOrEqual(1);
    expect(demand.baseline_strength).toBeGreaterThanOrEqual(0);
  });
});
