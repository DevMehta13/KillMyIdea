/**
 * Step 1: Interpret — parse raw idea input into a structured summary + category.
 *
 * Validates LLM response with Zod schema before returning.
 * Clamps vagueness_score to [0, 1] range.
 */

import type { StructuredSummary, IdeaCategory } from '@/types/database';
import type { InterpretInput, InterpretOutput } from '@/types/pipeline';
import { callWithFallback } from '@/lib/pipeline/ai/retry';
import { classifyIdeaCategory } from '@/lib/pipeline/ml/categorizer';
import { safeParseLLMResponse, interpretResponseSchema } from '@/lib/pipeline/schemas';

const SYSTEM_PROMPT = `You are a startup idea analyst. Given a raw idea description, extract a structured summary.

Respond with valid JSON matching this exact shape:
{
  "problem": "The core problem being solved (1-2 sentences)",
  "solution": "The proposed solution (1-2 sentences)",
  "target_user": "Who this is for (specific persona or segment)",
  "business_model": "How this would make money (or 'unclear' if not stated)",
  "key_assumptions": ["assumption 1", "assumption 2", ...],
  "vagueness_flags": ["vague area 1", ...],
  "vagueness_score": 0.0
}

Rules:
- "key_assumptions" should list 2-5 core assumptions the idea relies on
- "vagueness_flags" should list areas where the input is unclear or underspecified
- "vagueness_score" is 0.0 (crystal clear) to 1.0 (extremely vague)
- If target_user or problem is not explicitly stated, infer the most likely answer and add a vagueness_flag
- Be analytical, not cheerful. Do not add optimism.`;

export async function interpret(input: InterpretInput): Promise<InterpretOutput> {
  const userPrompt = [
    `Idea description: ${input.raw_input}`,
    input.target_user ? `Target user (provided): ${input.target_user}` : '',
    input.problem_statement ? `Problem statement (provided): ${input.problem_statement}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // If category is preserved from previous run (DEC-025), skip classification
  const shouldClassify = !input.preserve_category;

  // Run LLM interpretation and (optionally) category classification in parallel
  const [interpretationResult, categoryResult] = await Promise.all([
    callWithFallback({
      prompt: userPrompt,
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.4,
      maxTokens: 1024,
    }),
    shouldClassify
      ? classifyIdeaCategory(input.raw_input, input.target_user, input.problem_statement)
      : Promise.resolve({ category: input.preserve_category! }),
  ]);

  // Validate LLM response with Zod schema
  const validated = safeParseLLMResponse(
    interpretationResult.text,
    interpretResponseSchema,
    'Step 1: Interpret'
  );

  // Build StructuredSummary from validated data
  const interpretation: StructuredSummary = {
    problem: validated.problem,
    solution: validated.solution,
    target_user: validated.target_user,
    business_model: validated.business_model,
    key_assumptions: validated.key_assumptions,
    vagueness_flags: validated.vagueness_flags,
    vagueness_score: Math.max(0, Math.min(1, validated.vagueness_score)),
  };

  return {
    interpretation,
    category: categoryResult.category,
  };
}
