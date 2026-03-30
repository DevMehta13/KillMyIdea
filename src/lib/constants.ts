/**
 * Application constants — scoring weights, verdict thresholds, credit packages.
 * Derived from PRD Section 10 and DB_SCHEMA.md admin_settings seed values.
 * These are compile-time defaults; admin_settings DB table can override at runtime.
 */

import type { IdeaCategory, SignalCategory, Verdict } from '@/types/database';

// ─── Scoring Dimensions & Weights (PRD Section 10) ──────────────────────────

export const SCORING_DIMENSIONS: SignalCategory[] = [
  'demand',
  'urgency',
  'distribution',
  'differentiation',
  'competition',
  'monetization',
  'execution',
] as const;

export const DEFAULT_SCORING_WEIGHTS: Record<SignalCategory, number> = {
  demand: 0.20,
  urgency: 0.20,
  distribution: 0.20,
  differentiation: 0.12,
  competition: 0.10,
  monetization: 0.10,
  execution: 0.08,
};

// ─── Verdict Thresholds ──────────────────────────────────────────────────────

export const VERDICT_THRESHOLDS: { min: number; verdict: Verdict }[] = [
  { min: 7.5, verdict: 'pursue' },
  { min: 5.5, verdict: 'refine' },
  { min: 4.0, verdict: 'test_first' },
  { min: 0, verdict: 'drop' },
];

export const LOW_CONFIDENCE_DIMENSION_THRESHOLD = 4;
export const INSUFFICIENT_DATA_VERDICT: Verdict = 'insufficient_data';

// ─── Verdict Display ─────────────────────────────────────────────────────────

export const VERDICT_COLORS: Record<Verdict, string> = {
  pursue: '#22C55E',
  refine: '#F59E0B',
  test_first: '#3B82F6',
  drop: '#EF4444',
  insufficient_data: '#6B7280',
};

export const VERDICT_LABELS: Record<Verdict, string> = {
  pursue: 'Pursue',
  refine: 'Refine',
  test_first: 'Test First',
  drop: 'Drop',
  insufficient_data: 'Insufficient Data',
};

// ─── Credit Packages (INR pricing) ───────────────────────────────────────────

export const CREDIT_PACKAGES = [
  { id: 'pack_5', credits: 5, price_inr: 99 },
  { id: 'pack_20', credits: 20, price_inr: 299 },
  { id: 'pack_50', credits: 50, price_inr: 599 },
] as const;

export const FREE_SIGNUP_CREDITS = 3;

// ─── Idea Categories ─────────────────────────────────────────────────────────

export const IDEA_CATEGORIES: IdeaCategory[] = [
  'b2b_saas',
  'consumer_app',
  'devtool',
  'marketplace',
  'hardware',
  'fintech',
  'edtech',
  'healthtech',
  'creator_economy',
  'other',
] as const;

export const IDEA_CATEGORY_LABELS: Record<IdeaCategory, string> = {
  b2b_saas: 'B2B SaaS',
  consumer_app: 'Consumer App',
  devtool: 'Developer Tool',
  marketplace: 'Marketplace',
  hardware: 'Hardware',
  fintech: 'Fintech',
  edtech: 'EdTech',
  healthtech: 'HealthTech',
  creator_economy: 'Creator Economy',
  other: 'Other',
};

// ─── Pipeline ────────────────────────────────────────────────────────────────

export const PIPELINE_STEPS = [
  { step: 1, name: 'Interpreting idea' },
  { step: 2, name: 'Generating questions' },
  { step: 3, name: 'Collecting signals' },
  { step: 4, name: 'Interpreting signals' },
  { step: 5, name: 'Scoring dimensions' },
  { step: 6, name: 'Determining verdict' },
  { step: 7, name: 'Generating report' },
] as const;

export const TOTAL_PIPELINE_STEPS = 7;

// ─── Rate Limits ─────────────────────────────────────────────────────────────

export const QUICK_ROAST_RATE_LIMIT = {
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
};

// ─── Input Constraints ───────────────────────────────────────────────────────

export const INPUT_LIMITS = {
  quickRoastIdea: { min: 10, max: 500 },
  ideaTitle: { min: 3, max: 200 },
  ideaRawInput: { min: 10, max: 5000 },
  ideaTargetUser: { max: 500 },
  ideaProblemStatement: { max: 2000 },
  clarificationAnswer: { max: 2000 },    // DEC-031
  clarificationAnswerCount: { max: 6 },  // DEC-031 — matches Step 2 which generates up to 6 questions
} as const;

// ─── Rate Limit Tiers (DEC-029, DEC-034) ────────────────────────────────────

export const USER_RATE_LIMITS = {
  analysis: { maxRequests: 10, windowMs: 60 * 60 * 1000 },    // 10/hour
  pipelineStep: { maxRequests: 100, windowMs: 60 * 1000 },    // 100/min
  ideaCrud: { maxRequests: 30, windowMs: 60 * 1000 },         // 30/min
} as const;

export const RATE_LIMIT_TIERS = {
  pipelineStep: { maxRequests: 100, windowMs: 60 * 1000 },    // 100/min
  creditPayment: { maxRequests: 10, windowMs: 60 * 1000 },    // 10/min
  read: { maxRequests: 60, windowMs: 60 * 1000 },             // 60/min
  write: { maxRequests: 30, windowMs: 60 * 1000 },            // 30/min
  admin: { maxRequests: 30, windowMs: 60 * 1000 },            // 30/min
} as const;

// ─── Vagueness Gate (DEC-021) ────────────────────────────────────────────────

export const VAGUENESS_BLOCK_THRESHOLD = 0.7;

// ─── Signal Provider Budgets ────────────────────────────────────────────────

export const SIGNAL_PROVIDER_BUDGETS = {
  serper: { monthly_limit: 2500, queries_per_analysis: 3 },
  serpapi_trends: { monthly_limit: 100, queries_per_analysis: 1 },
} as const;

// ─── Brand Colors ────────────────────────────────────────────────────────────

export const BRAND = {
  primary: '#1E3A5F',
} as const;
