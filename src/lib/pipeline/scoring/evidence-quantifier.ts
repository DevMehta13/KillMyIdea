/**
 * Evidence quantifier — pre-computes evidence baselines per dimension (DEC-020).
 * Fed into Step 4 (interpret-signals) to ground LLM signal_strength.
 * LLM can adjust +/-0.15 from these baselines.
 *
 * SCORING RATIONALE (documented per PRD Section 10 + DEC-020):
 *
 * HackerNews scoring:
 *   HN is a proxy for tech community interest. Points/comments reflect engagement.
 *   - >100 points = viral post = strong validated interest (0.85)
 *   - >30 points  = notable discussion = moderate interest (0.65)
 *   - >10 points  = some engagement = weak signal (0.45)
 *   - <=10 points = noise-level post = minimal signal (0.25)
 *   These thresholds come from HN's distribution: ~95% of posts get <10 points,
 *   ~1% exceed 100. A post with 30+ points is already in the top ~5%.
 *
 * Serper (Google Search) scoring:
 *   Google ranking position reflects content relevance and market maturity.
 *   - Position 1-3 = dominant results, established market (0.7)
 *   - Position 4-6 = notable presence (0.5)
 *   - Position 7+  = below fold, weak presence (0.3)
 *   Keyword relevance check: if the search result title/snippet doesn't contain
 *   any of our search keywords, it gets a penalty (×0.6) since the result may
 *   be tangentially related at best.
 *
 * Google Trends scoring:
 *   Interest trajectory indicates market timing and demand momentum.
 *   - Growing >50% = surging interest = strong timing signal (0.85)
 *   - Growing <=50% = positive trend (0.65)
 *   - Stable = sustained interest (0.45)
 *   - Declining = fading interest (0.25)
 *   The 50% threshold separates gradual growth from significant surges.
 *
 * LLM Knowledge scoring:
 *   Training-data-based analysis. Not real-time. May hallucinate.
 *   - With URL (possibly real): 0.4 (lower than any real source)
 *   - Without URL: 0.25 (least trustworthy evidence type)
 *   LLM Knowledge is capped below real signal sources because it cannot
 *   be independently verified. A hallucinated competitor is worse than
 *   no data at all if it inflates a baseline.
 *
 * Diminishing returns formula: weight = 1 / (1 + i × 0.3)
 *   First signal gets weight 1.0, second 0.77, third 0.63, fourth 0.53...
 *   Rationale: multiple signals confirming the same thing add evidence but
 *   with declining marginal value. The 0.3 decay rate means 5 signals
 *   contribute ~3.5 "effective signals" — preventing a single source type
 *   from dominating by volume.
 *
 * Diversity bonus: +0.05 per additional source type
 *   Rationale: evidence from multiple independent sources is more trustworthy
 *   than many signals from one source. 2 sources = +0.05, 3 = +0.10, 4 = +0.15.
 *   Linear because each new source type adds roughly equal independent corroboration.
 *   Capped naturally by the 4 available source types.
 */

import type { SignalCategory } from '@/types/database';
import type { SignalResult, EvidenceBaseline } from '@/types/pipeline';
import { SCORING_DIMENSIONS } from '@/lib/constants';

/**
 * Score a single signal's contribution to a dimension baseline.
 * Returns a value between 0 and 1 representing this signal's strength.
 *
 * See module-level documentation for rationale behind each threshold.
 */
function scoreSignalContribution(signal: SignalResult, searchKeywords?: string[]): number {
  const data = signal.raw_data as Record<string, unknown>;

  switch (signal.source_type) {
    case 'hackernews': {
      const points = Number(data.points ?? 0);
      const comments = Number(data.num_comments ?? 0);
      // HN engagement tiers based on platform distribution
      // Top 1% = >100pts, top 5% = >30pts, top 20% = >10pts
      if (points > 100 || comments > 50) return 0.85;
      if (points > 30 || comments > 15) return 0.65;
      if (points > 10 || comments > 5) return 0.45;
      return 0.25;
    }

    case 'serper': {
      const position = Number(data.position ?? 10);
      const title = String(data.title ?? '').toLowerCase();
      const snippet = String(data.snippet ?? '').toLowerCase();

      // Base score from Google ranking position
      let score: number;
      if (position <= 3) score = 0.7;
      else if (position <= 6) score = 0.5;
      else score = 0.3;

      // Semantic relevance penalty: if the result doesn't mention any search
      // keywords in the title or snippet, it's likely not directly relevant.
      // This prevents unrelated results at high positions from inflating baselines.
      if (searchKeywords && searchKeywords.length > 0) {
        const hasRelevantKeyword = searchKeywords.some(
          (kw) => title.includes(kw.toLowerCase()) || snippet.includes(kw.toLowerCase())
        );
        if (!hasRelevantKeyword) {
          score *= 0.6; // 40% penalty for irrelevant results
        }
      }

      return score;
    }

    case 'google_trends': {
      const direction = data.direction as string;
      const growthPct = Number(data.growth_pct ?? 0);
      // Trend direction reflects market timing momentum
      if (direction === 'growing' && growthPct > 50) return 0.85;
      if (direction === 'growing') return 0.65;
      if (direction === 'stable') return 0.45;
      if (direction === 'declining') return 0.25;
      return 0.35;
    }

    case 'llm_knowledge': {
      // LLM knowledge is the LOWEST confidence source — training data, not real-time.
      // Capped below all real signal sources to prevent hallucinated data
      // from inflating baselines. See module-level rationale.
      if (signal.source_url) return 0.4;
      return 0.25;
    }

    default:
      return 0.35;
  }
}

/**
 * Compute evidence baselines from raw collected signals.
 * Counts and scores evidence per dimension to produce a numeric baseline
 * that the LLM uses as an anchor for signal_strength assignment.
 */
export function computeEvidenceBaselines(
  signals: SignalResult[]
): EvidenceBaseline[] {
  // Extract search keywords from signal summaries for relevance checking
  const searchKeywords = extractSearchKeywords(signals);

  return (SCORING_DIMENSIONS as unknown as SignalCategory[]).map((dimension) => {
    // Filter signals that map to this dimension
    const dimSignals = signals.filter(
      (s) => s.signal_category === dimension
    );

    if (dimSignals.length === 0) {
      return {
        dimension,
        baseline_strength: 0.35, // No evidence = below neutral
        contributing_signals: 0,
        has_real_urls: false,
        signal_sources: [],
      };
    }

    // Score each signal's contribution
    const contributions = dimSignals.map((s) => scoreSignalContribution(s, searchKeywords));

    // Weighted average with diminishing returns:
    // First signals matter most, additional signals add less.
    // Formula: weight_i = 1 / (1 + i × 0.3)
    // See module-level rationale for the 0.3 decay constant.
    let weightedSum = 0;
    let weightSum = 0;
    for (let i = 0; i < contributions.length; i++) {
      const weight = 1 / (1 + i * 0.3);
      weightedSum += contributions[i] * weight;
      weightSum += weight;
    }

    const rawBaseline = weightSum > 0 ? weightedSum / weightSum : 0.35;

    // Diversity bonus: +0.05 per additional source type.
    // Multiple independent sources = more trustworthy evidence.
    const sourcesSet = new Set(dimSignals.map((s) => s.source_type));
    const diversityBonus = sourcesSet.size > 1 ? 0.05 * (sourcesSet.size - 1) : 0;

    // Clamp to 0-1
    const baseline = Math.max(0, Math.min(1, rawBaseline + diversityBonus));

    // Check for real (non-LLM) URLs
    const hasRealUrls = dimSignals.some(
      (s) => s.source_url && s.source_type !== 'llm_knowledge'
    );

    return {
      dimension,
      baseline_strength: Math.round(baseline * 100) / 100,
      contributing_signals: dimSignals.length,
      has_real_urls: hasRealUrls,
      signal_sources: [...sourcesSet],
    };
  });
}

/**
 * Extract search keywords from signal data for semantic relevance checking.
 * Uses unique words from signal summaries that are likely search terms.
 */
function extractSearchKeywords(signals: SignalResult[]): string[] {
  const words = new Set<string>();
  for (const s of signals) {
    if (s.normalized_summary) {
      for (const word of s.normalized_summary.split(/\s+/)) {
        const clean = word.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        if (clean.length > 3) words.add(clean);
      }
    }
  }
  return [...words].slice(0, 20);
}

/**
 * Format baselines as a human-readable string for the LLM prompt.
 */
export function formatBaselinesForPrompt(baselines: EvidenceBaseline[]): string {
  return baselines
    .map((b) => {
      const sources = b.signal_sources.length > 0
        ? b.signal_sources.join(', ')
        : 'none';
      const urlNote = b.has_real_urls ? 'has verified URLs' : 'no verified URLs';
      return `- ${b.dimension}: baseline=${b.baseline_strength.toFixed(2)} (${b.contributing_signals} signals from [${sources}], ${urlNote})`;
    })
    .join('\n');
}
