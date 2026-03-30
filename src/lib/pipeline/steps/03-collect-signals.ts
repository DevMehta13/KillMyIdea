/**
 * Step 3: Collect Signals — gather data from multiple sources in parallel.
 *
 * Sources (via provider registry):
 *   1. HackerNews Algolia API — community discussions, Show HN, Ask HN
 *   2. LLM Knowledge Analysis — real competitor data, market size, failure patterns
 *   3. Serper.dev — real Google search results (DEC-018, requires SERPER_API_KEY)
 *   4. Google Trends — demand timing data (DEC-019, requires SERPAPI_KEY)
 *
 * All run in parallel. Each source can fail independently (graceful degradation).
 */

import type { CollectSignalsInput, CollectSignalsOutput, SignalResult } from '@/types/pipeline';
import { getEnabledProviders } from '@/lib/pipeline/signals/provider-registry';
import type { SignalQuery } from '@/lib/pipeline/signals/types';
import { logger } from '@/lib/logger';

export async function collectSignals(input: CollectSignalsInput): Promise<CollectSignalsOutput> {
  const query: SignalQuery = {
    problem: input.interpretation.problem,
    solution: input.interpretation.solution,
    target_user: input.interpretation.target_user,
    category: input.category,
    keywords: [
      ...input.interpretation.key_assumptions.slice(0, 2),
      input.interpretation.business_model,
    ].filter(Boolean),
  };

  const sourcesUsed: string[] = [];
  const sourcesFailed: string[] = [];
  const allSignals: SignalResult[] = [];

  const providers = getEnabledProviders();

  // Run all enabled providers in parallel
  const results = await Promise.allSettled(
    providers.map((p) => p.collect(query))
  );

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const result = results[i];

    if (result.status === 'fulfilled') {
      if (result.value.length > 0) {
        allSignals.push(...result.value);
        sourcesUsed.push(provider.name);
      }
      // Provider returned empty array (e.g., no API key) — not a failure
    } else {
      logger.warn('Signal provider failed', { action: 'collect_signals', provider: provider.name, error: String(result.reason) });
      sourcesFailed.push(provider.name);
    }
  }

  return {
    signals_collected: allSignals.length,
    sources_used: sourcesUsed,
    sources_failed: sourcesFailed,
    signals: allSignals,
  };
}
