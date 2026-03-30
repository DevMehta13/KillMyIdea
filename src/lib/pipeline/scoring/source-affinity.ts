/**
 * Category-source affinity map (DEC-011, DEC-018).
 * Controls how much each signal source's confidence impacts scoring per category.
 * Prevents penalizing ideas because their category is underrepresented on a specific source.
 */

import type { IdeaCategory, SignalSourceType } from '@/types/database';

// 1.0 = source is strong for this category
// 0.5-0.8 = partial coverage
// < 0.5 = weak coverage, reduce signal impact

const SOURCE_AFFINITY: Record<SignalSourceType, Record<IdeaCategory, number>> = {
  hackernews: {
    b2b_saas: 0.95,
    devtool: 1.0,
    consumer_app: 0.8,
    marketplace: 0.75,
    fintech: 0.7,
    creator_economy: 0.65,
    edtech: 0.55,
    healthtech: 0.45,
    hardware: 0.4,
    other: 0.6,
  },
  serper: {
    // Google search has broad coverage across all categories
    b2b_saas: 0.9,
    devtool: 0.85,
    consumer_app: 0.9,
    marketplace: 0.9,
    fintech: 0.85,
    creator_economy: 0.85,
    edtech: 0.9,
    healthtech: 0.9,
    hardware: 0.85,
    other: 0.85,
  },
  google_trends: {
    // Trends data is broadly useful but stronger for consumer-facing categories
    b2b_saas: 0.7,
    devtool: 0.6,
    consumer_app: 0.95,
    marketplace: 0.9,
    fintech: 0.8,
    creator_economy: 0.9,
    edtech: 0.85,
    healthtech: 0.8,
    hardware: 0.75,
    other: 0.75,
  },
  llm_knowledge: {
    // LLM knowledge is uniformly moderate — it's training data, not real-time
    b2b_saas: 0.7,
    devtool: 0.7,
    consumer_app: 0.7,
    marketplace: 0.7,
    fintech: 0.7,
    creator_economy: 0.65,
    edtech: 0.65,
    healthtech: 0.65,
    hardware: 0.6,
    other: 0.6,
  },
};

/**
 * Returns a multiplier (0-1) for a specific source's signal confidence.
 * Lower values mean signals from this source should be weighted less for this category.
 */
export function getSourceAffinityMultiplier(
  category: IdeaCategory,
  sourceType: SignalSourceType = 'hackernews'
): number {
  const affinityMap = SOURCE_AFFINITY[sourceType];
  if (!affinityMap) return 0.6;
  return affinityMap[category] ?? 0.6;
}
