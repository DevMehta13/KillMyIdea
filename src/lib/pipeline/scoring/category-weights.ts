/**
 * Per-category weight adjustments (±3% per dimension).
 * Category weighting is SECONDARY to direct signal evidence (DEC-016).
 */

import type { IdeaCategory, SignalCategory } from '@/types/database';

type WeightAdjustments = Partial<Record<SignalCategory, number>>;

const CATEGORY_ADJUSTMENTS: Record<IdeaCategory, WeightAdjustments> = {
  b2b_saas: { distribution: 0.03, monetization: 0.02, urgency: -0.02, execution: -0.03 },
  consumer_app: { demand: 0.03, distribution: 0.02, differentiation: -0.02, execution: -0.03 },
  devtool: { demand: -0.03, distribution: 0.03, differentiation: 0.02, competition: -0.02 },
  marketplace: { demand: 0.03, distribution: 0.03, competition: -0.03, execution: -0.03 },
  hardware: { execution: 0.03, monetization: 0.02, distribution: -0.03, demand: -0.02 },
  fintech: { monetization: 0.03, competition: 0.02, execution: -0.02, demand: -0.03 },
  edtech: { demand: 0.03, urgency: -0.03, monetization: 0.02, competition: -0.02 },
  healthtech: { urgency: 0.03, execution: 0.02, distribution: -0.03, demand: -0.02 },
  creator_economy: { differentiation: 0.03, distribution: 0.02, monetization: -0.03, urgency: -0.02 },
  other: {},
};

export function getCategoryWeightAdjustments(category: IdeaCategory): WeightAdjustments {
  return CATEGORY_ADJUSTMENTS[category] ?? {};
}
