/**
 * Step 2: Clarify — generate targeted clarification questions based on the interpretation.
 *
 * Validates LLM response with Zod schema.
 * Ensures each question maps to a valid scoring dimension.
 */

import type { ClarificationQuestion, SignalCategory } from '@/types/database';
import type { ClarifyInput, ClarifyOutput } from '@/types/pipeline';
import { callWithFallback } from '@/lib/pipeline/ai/retry';
import { SCORING_DIMENSIONS } from '@/lib/constants';
import { safeParseLLMResponse, clarifyResponseSchema } from '@/lib/pipeline/schemas';

const SYSTEM_PROMPT = `You are a startup idea analyst preparing clarification questions. Based on the structured interpretation of a startup idea, generate targeted questions that would help validate or refute the idea.

Respond with valid JSON matching this shape:
{
  "questions": [
    {
      "id": "q1",
      "question": "The question text",
      "dimension": "demand",
      "why_asked": "Brief explanation of why this matters"
    }
  ]
}

Rules:
- Generate 3-6 questions, no more, no less
- Each question must target one of these dimensions: ${SCORING_DIMENSIONS.join(', ')}
- Prioritize questions about the weakest or most vague areas
- Questions should be specific and answerable, not generic
- "id" must be sequential: q1, q2, q3, etc.
- "why_asked" should be 1 sentence explaining what this question helps validate
- Do NOT ask obvious questions the founder already answered
- Focus on: demand evidence, distribution strategy, competitive landscape, monetization clarity, execution risk`;

export async function clarify(input: ClarifyInput): Promise<ClarifyOutput> {
  const userPrompt = `Here is the structured interpretation of a startup idea:

Problem: ${input.interpretation.problem}
Solution: ${input.interpretation.solution}
Target user: ${input.interpretation.target_user}
Business model: ${input.interpretation.business_model}
Key assumptions: ${input.interpretation.key_assumptions.join('; ')}
Vagueness flags: ${input.interpretation.vagueness_flags.join('; ')}
Vagueness score: ${input.interpretation.vagueness_score}

Generate clarification questions targeting the weakest areas.`;

  const { text } = await callWithFallback({
    prompt: userPrompt,
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.5,
    maxTokens: 1024,
  });

  // Validate LLM response with Zod schema
  const validated = safeParseLLMResponse(text, clarifyResponseSchema, 'Step 2: Clarify');

  // Normalize question IDs to be sequential
  const questions: ClarificationQuestion[] = validated.questions
    .slice(0, 6)
    .map((q, idx) => ({
      id: `q${idx + 1}`,
      question: q.question,
      dimension: q.dimension as SignalCategory,
      why_asked: q.why_asked,
    }));

  return {
    questions,
    version_id: '', // Filled by the pipeline orchestrator
  };
}
