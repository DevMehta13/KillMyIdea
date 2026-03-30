/**
 * Zod validation schemas for all API inputs.
 * Shapes must match API_CONTRACTS.md exactly.
 */

import { z } from 'zod';
import { INPUT_LIMITS } from '@/lib/constants';

// ─── Quick Roast ─────────────────────────────────────────────────────────────

export const quickRoastSchema = z.object({
  idea: z
    .string()
    .min(INPUT_LIMITS.quickRoastIdea.min, `Idea must be at least ${INPUT_LIMITS.quickRoastIdea.min} characters`)
    .max(INPUT_LIMITS.quickRoastIdea.max, `Idea must be at most ${INPUT_LIMITS.quickRoastIdea.max} characters`),
});

// ─── Ideas ───────────────────────────────────────────────────────────────────

export const createIdeaSchema = z.object({
  title: z
    .string()
    .min(INPUT_LIMITS.ideaTitle.min)
    .max(INPUT_LIMITS.ideaTitle.max),
  raw_input: z
    .string()
    .min(INPUT_LIMITS.ideaRawInput.min)
    .max(INPUT_LIMITS.ideaRawInput.max),
  target_user: z
    .string()
    .max(INPUT_LIMITS.ideaTargetUser.max)
    .optional(),
  problem_statement: z
    .string()
    .max(INPUT_LIMITS.ideaProblemStatement.max)
    .optional(),
  quickRoastId: z.string().uuid().optional(),
});

export const updateIdeaSchema = z
  .object({
    title: z
      .string()
      .min(INPUT_LIMITS.ideaTitle.min)
      .max(INPUT_LIMITS.ideaTitle.max)
      .optional(),
    raw_input: z
      .string()
      .min(INPUT_LIMITS.ideaRawInput.min)
      .max(INPUT_LIMITS.ideaRawInput.max)
      .optional(),
    target_user: z
      .string()
      .max(INPUT_LIMITS.ideaTargetUser.max)
      .optional(),
    problem_statement: z
      .string()
      .max(INPUT_LIMITS.ideaProblemStatement.max)
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  });

// ─── Analysis Pipeline ───────────────────────────────────────────────────────

export const startAnalysisSchema = z.object({
  version_id: z.string().uuid().optional(),
});

export const pipelineStepSchema = z.object({
  run_id: z.string().uuid(),
});

export const submitClarificationSchema = z.object({
  version_id: z.string().uuid(),
  answers: z.array(
    z.object({
      question_id: z.string(),
      answer: z.string().max(INPUT_LIMITS.clarificationAnswer.max, `Answer must be at most ${INPUT_LIMITS.clarificationAnswer.max} characters`),
    })
  ).max(INPUT_LIMITS.clarificationAnswerCount.max, `At most ${INPUT_LIMITS.clarificationAnswerCount.max} answers allowed`),
  skip: z.boolean(),
});

// ─── Credits ─────────────────────────────────────────────────────────────────

export const purchaseCreditsSchema = z.object({
  package_id: z.string(),
});

export const verifyPaymentSchema = z.object({
  session_id: z.string(),
});

// ─── Share ───────────────────────────────────────────────────────────────────

export const createShareSchema = z.object({
  report_id: z.string().uuid(),
  visibility: z.enum(['public', 'unlisted']).default('unlisted'),
});

// ─── Compare ─────────────────────────────────────────────────────────────────

export const compareIdeasSchema = z.object({
  idea_ids: z
    .array(z.string().uuid())
    .min(2, 'At least 2 ideas required')
    .max(4, 'At most 4 ideas allowed'),
});

// ─── User Profile ────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
});

// ─── Admin ───────────────────────────────────────────────────────────────────

export const adminCreditAdjustmentSchema = z.object({
  amount: z.number().int(),
  description: z.string().min(1).max(500),
});
