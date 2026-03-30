/**
 * Zod schemas for validating LLM responses in pipeline steps.
 *
 * Every LLM call returns JSON. These schemas validate the structure
 * so malformed output throws a clear validation error instead of
 * propagating garbage through the pipeline.
 *
 * Usage: safeParseLLMResponse(text, schema, stepName)
 *  - Returns validated data on success
 *  - Throws descriptive error on failure (for retry logic)
 */

import { z } from 'zod';
import { SCORING_DIMENSIONS } from '@/lib/constants';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const signalCategoryEnum = z.enum([
  'demand', 'urgency', 'distribution', 'differentiation',
  'competition', 'monetization', 'execution',
]);

const ideaCategoryEnum = z.enum([
  'b2b_saas', 'consumer_app', 'devtool', 'marketplace', 'hardware',
  'fintech', 'edtech', 'healthtech', 'creator_economy', 'other',
]);

// ─── Step 1: Interpret ────────────────────────────────────────────────────────

export const interpretResponseSchema = z.object({
  problem: z.string().min(1, 'problem is required'),
  solution: z.string().min(1, 'solution is required'),
  target_user: z.string().min(1, 'target_user is required'),
  business_model: z.string().default('unclear'),
  key_assumptions: z.array(z.string()).default([]),
  vagueness_flags: z.array(z.string()).default([]),
  vagueness_score: z.number().min(0).max(1).default(0.5),
});

export type InterpretResponse = z.infer<typeof interpretResponseSchema>;

// ─── Step 2: Clarify ──────────────────────────────────────────────────────────

export const clarifyQuestionSchema = z.object({
  id: z.string(),
  question: z.string().min(1),
  dimension: signalCategoryEnum.catch('demand'),
  why_asked: z.string().default('Helps validate this dimension of the idea.'),
});

export const clarifyResponseSchema = z.object({
  questions: z.array(clarifyQuestionSchema).min(1, 'At least 1 question required').max(6),
});

export type ClarifyResponse = z.infer<typeof clarifyResponseSchema>;

// ─── Step 4: Interpret Signals ────────────────────────────────────────────────

export const dimensionInsightSchema = z.object({
  dimension: signalCategoryEnum,
  signal_strength: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  evidence_count: z.number().int().min(0).default(0),
});

export const interpretSignalsResponseSchema = z.object({
  dimension_insights: z.array(dimensionInsightSchema).min(1),
});

export type InterpretSignalsResponse = z.infer<typeof interpretSignalsResponseSchema>;

// ─── Step 7: Report ───────────────────────────────────────────────────────────

const verdictEnum = z.enum(['pursue', 'refine', 'test_first', 'drop', 'insufficient_data']);

export const reportResponseSchema = z.object({
  executive_summary: z.string().min(1, 'executive_summary required'),
  idea_interpretation: z.object({
    problem: z.string(),
    solution: z.string(),
    target_user: z.string(),
  }),
  verdict: z.object({
    verdict: verdictEnum,
    score: z.number(),
    confidence: z.number(),
    one_liner: z.string(),
  }),
  dimension_reasoning: z.array(z.object({
    dimension: signalCategoryEnum,
    score: z.number(),
    reasoning: z.string(),
    evidence_refs: z.array(z.string()).default([]),
  })).min(1),
  assumptions: z.array(z.object({
    text: z.string(),
    type: z.enum(['user_stated', 'inferred']).catch('inferred'),
    source: z.string().default('analysis'),
  })).default([]),
  red_flags: z.array(z.object({
    text: z.string(),
    severity: z.enum(['high', 'medium', 'low']).catch('medium'),
    evidence_ref: z.string().default(''),
  })).default([]),
  green_flags: z.array(z.object({
    text: z.string(),
    strength: z.enum(['strong', 'moderate']).catch('moderate'),
    evidence_ref: z.string().default(''),
  })).default([]),
  next_steps: z.array(z.object({
    action: z.string(),
    priority: z.number().int().min(1),
    type: z.enum(['test', 'refine', 'validate', 'build']).catch('validate'),
  })).default([]),
  weaknesses: z.string().default(''),
  strengthening_suggestions: z.string().default(''),
});

export type ReportResponse = z.infer<typeof reportResponseSchema>;

// ─── Categorizer ──────────────────────────────────────────────────────────────

export const categoryResponseSchema = z.object({
  category: ideaCategoryEnum.catch('other'),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

// ─── LLM Knowledge (Competitors) ─────────────────────────────────────────────

export const llmCompetitorSchema = z.object({
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string().default(''),
    url: z.string().nullable().default(null),
    pricing: z.string().nullable().default(null),
    users: z.string().nullable().default(null),
  })).default([]),
  market_size: z.object({
    estimate: z.string().default('unknown'),
    reasoning: z.string().default(''),
  }).default({ estimate: 'unknown', reasoning: '' }),
  failed_startups: z.array(z.object({
    name: z.string(),
    reason: z.string().default('unknown'),
  })).default([]),
  distribution_insights: z.array(z.string()).default([]),
  key_risks: z.array(z.string()).default([]),
});

export const llmMarketValidationSchema = z.object({
  demand_signals: z.array(z.string()).default([]),
  urgency_indicators: z.array(z.string()).default([]),
  monetization_patterns: z.array(z.string()).default([]),
  execution_risks: z.array(z.string()).default([]),
});

// ─── Safe Parser ──────────────────────────────────────────────────────────────

/**
 * Safely parse LLM JSON response against a Zod schema.
 * Throws a descriptive error on parse or validation failure.
 */
export function safeParseLLMResponse<T>(
  rawText: string,
  schema: z.ZodType<T>,
  stepName: string
): T {
  // Step 1: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (jsonError) {
    throw new Error(
      `[${stepName}] LLM returned invalid JSON: ${(jsonError as Error).message}. ` +
      `First 200 chars: "${rawText.slice(0, 200)}"`
    );
  }

  // Step 2: Validate against schema
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(
      `[${stepName}] LLM response failed schema validation: ${issues}`
    );
  }

  return result.data;
}
