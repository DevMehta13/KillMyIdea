/**
 * Step 4: Interpret Signals — use LLM to map raw signals + user evidence to scoring dimensions.
 *
 * Evidence sources considered:
 *   1. External signals (HackerNews, Serper.dev, Google Trends)
 *   2. User's clarification answers (direct founder knowledge)
 *   3. The structured interpretation from Step 1 (idea context)
 *
 * Reproducibility (DEC-020):
 *   - Pre-computes evidence baselines per dimension from countable signal data
 *   - LLM receives baselines and is constrained to adjust within +/-0.15
 *   - Same signals → same baselines → similar scores across runs
 *
 * Uses Gemini Pro (via usePro flag) for stronger reasoning quality.
 * Validates response with Zod schema.
 */

import type { InterpretSignalsInput, InterpretSignalsOutput, DimensionInsight } from '@/types/pipeline';
import type { SignalCategory } from '@/types/database';
import { callWithFallback } from '@/lib/pipeline/ai/retry';
import { SCORING_DIMENSIONS } from '@/lib/constants';
import { computeEvidenceBaselines, formatBaselinesForPrompt } from '@/lib/pipeline/scoring/evidence-quantifier';
import { safeParseLLMResponse, interpretSignalsResponseSchema } from '@/lib/pipeline/schemas';

const SYSTEM_PROMPT = `You are an expert startup analyst evaluating a business idea across 7 dimensions. You have three types of evidence:

1. **External signals** — real data from HackerNews discussions, Google search results, Google Trends, and market analysis
2. **Founder's answers** — direct answers from the founder (first-party evidence, weight heavily)
3. **Idea context** — the structured interpretation of the idea

SCORING (internal — do NOT expose these numbers in your summary):
- You will receive pre-computed evidence baselines per dimension.
- Your signal_strength MUST stay within +/-0.15 of the provided baseline.
- Adjust UP if founder answers provide strong additional evidence.
- Adjust DOWN if signals are misleading or context reveals hidden problems.
- signal_strength: 0.0-0.3 = evidence suggests problems, 0.4-0.6 = mixed/insufficient, 0.6-0.8 = positive, 0.8-1.0 = strong positive
- confidence: how much evidence you actually have (not how sure you are)

SUMMARY WRITING RULES (critical — this text is shown directly to the founder):
- Write the summary in PLAIN ENGLISH for a non-technical founder
- NEVER mention "baseline", "signal_strength", "confidence", deviation numbers, or internal scoring terms
- DO say what evidence you found and what it means: "We found 3 active HackerNews discussions about this problem, suggesting real community interest"
- DO say what's missing: "We couldn't find strong evidence of willingness to pay in this space"
- DO reference specific evidence: "A Google Trends analysis shows growing search interest (+40% over 12 months)"
- DO mention what the founder told you: "You mentioned having 20 beta users, which supports demand"
- Keep each summary to 2-3 sentences. Be specific, not vague.

The 7 dimensions: ${SCORING_DIMENSIONS.join(', ')}

Respond with valid JSON:
{
  "dimension_insights": [
    {
      "dimension": "demand",
      "signal_strength": 0.65,
      "confidence": 0.55,
      "summary": "Several HackerNews threads discuss frustration with existing meeting tools, and Google Trends shows a 40% rise in searches for 'async meeting' over the past year. Your mention of 20 beta users adds direct validation.",
      "evidence_count": 5
    }
  ]
}

You MUST include all 7 dimensions.`;

export async function interpretSignals(input: InterpretSignalsInput): Promise<InterpretSignalsOutput> {
  // Compute evidence baselines from raw signals (DEC-020)
  const baselines = computeEvidenceBaselines(input.signals);
  const baselineMap = new Map(baselines.map((b) => [b.dimension, b]));

  // Collect real URLs per dimension for evidence_urls
  const urlsByDimension = new Map<string, string[]>();
  for (const signal of input.signals) {
    if (signal.source_url && signal.signal_category && signal.source_type !== 'llm_knowledge') {
      const urls = urlsByDimension.get(signal.signal_category) ?? [];
      if (!urls.includes(signal.source_url)) {
        urls.push(signal.source_url);
        urlsByDimension.set(signal.signal_category, urls);
      }
    }
  }

  // Format external signals
  const signalSummaries = input.signals.map((s, idx) => {
    const data = s.raw_data as Record<string, unknown>;
    const parts = [
      `Signal ${idx + 1} [${s.source_type}/${s.signal_category ?? 'general'}]:`,
      s.normalized_summary ?? 'No summary',
    ];
    if (data.points !== undefined) parts.push(`Points: ${data.points}`);
    if (data.num_comments !== undefined) parts.push(`Comments: ${data.num_comments}`);
    if (data.position !== undefined) parts.push(`Position: ${data.position}`);
    if (data.direction !== undefined) parts.push(`Trend: ${data.direction}`);
    if (data.growth_pct !== undefined) parts.push(`Growth: ${data.growth_pct}%`);
    if (s.source_url) parts.push(`URL: ${s.source_url}`);
    return parts.join(' | ');
  });

  // Format clarification answers (founder evidence)
  const snapshot = input as unknown as { clarification_answers?: { question_id: string; answer: string }[] };
  const answers = snapshot.clarification_answers;
  let founderEvidence = 'No founder clarification answers provided (skipped).';
  if (answers && answers.length > 0) {
    founderEvidence = answers
      .map((a, i) => `Q${i + 1}: ${a.question_id}\nA: ${a.answer}`)
      .join('\n\n');
  }

  // Count signals by source type for prompt context
  const sourceCounts: Record<string, number> = {};
  for (const s of input.signals) {
    sourceCounts[s.source_type] = (sourceCounts[s.source_type] ?? 0) + 1;
  }
  const sourceBreakdown = Object.entries(sourceCounts)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  const userPrompt = `## Idea Context
Problem: ${input.interpretation.problem}
Solution: ${input.interpretation.solution}
Target user: ${input.interpretation.target_user}
Business model: ${input.interpretation.business_model}
Category: ${input.category}
Key assumptions: ${input.interpretation.key_assumptions.join('; ')}
Vagueness score: ${input.interpretation.vagueness_score} (0=very clear, 1=very vague)

## Founder's Clarification Answers (FIRST-PARTY EVIDENCE)
${founderEvidence}

## Pre-Computed Evidence Baselines (DEC-020)
Your signal_strength for each dimension MUST be within +/-0.15 of these baselines:
${formatBaselinesForPrompt(baselines)}

## External Signals (${input.signals.length} total: ${sourceBreakdown || 'none'})
${signalSummaries.length > 0 ? signalSummaries.join('\n') : 'No external signals were collected. Score based on idea context and founder answers.'}

Evaluate this idea across all 7 dimensions. Anchor your signal_strength to the baselines above.`;

  // Use Gemini Pro for deeper reasoning on signal interpretation
  const result = await callWithFallback(
    {
      prompt: userPrompt,
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.3, // Lower temp for reproducibility
      maxTokens: 2048,
    },
    { usePro: true }
  );

  // Validate LLM response with Zod schema
  const validated = safeParseLLMResponse(
    result.text,
    interpretSignalsResponseSchema,
    'Step 4: Interpret Signals'
  );

  // Clamp to baselines and build final insights
  const insightMap = new Map<string, DimensionInsight>();

  for (const insight of validated.dimension_insights) {
    const baseline = baselineMap.get(insight.dimension);
    const baselineVal = baseline?.baseline_strength ?? 0.5;

    // Clamp signal_strength to within +/-0.15 of baseline (DEC-020)
    const rawStrength = Math.max(0, Math.min(1, insight.signal_strength));
    const clampedStrength = Math.max(
      Math.max(0, baselineVal - 0.15),
      Math.min(Math.min(1, baselineVal + 0.15), rawStrength)
    );

    insightMap.set(insight.dimension, {
      dimension: insight.dimension as SignalCategory,
      signal_strength: Math.round(clampedStrength * 100) / 100,
      baseline_strength: baselineVal,
      confidence: Math.max(0, Math.min(1, insight.confidence)),
      summary: insight.summary,
      evidence_count: Math.max(0, Math.floor(insight.evidence_count)),
      evidence_urls: urlsByDimension.get(insight.dimension) ?? [],
    });
  }

  // Fill in missing dimensions
  const hasFounderAnswers = answers && answers.length > 0;
  const dimensionInsights: DimensionInsight[] = SCORING_DIMENSIONS.map((dim) => {
    const existing = insightMap.get(dim);
    if (existing) return existing;

    const baseline = baselineMap.get(dim as SignalCategory);
    const baselineVal = baseline?.baseline_strength ?? (hasFounderAnswers ? 0.5 : 0.4);

    return {
      dimension: dim as SignalCategory,
      signal_strength: baselineVal,
      baseline_strength: baselineVal,
      confidence: hasFounderAnswers ? 0.3 : 0.15,
      summary: 'We couldn\'t find enough external evidence to confidently evaluate this area. More detail in your idea description or clarification answers would help.',
      evidence_count: 0,
      evidence_urls: [],
    };
  });

  return { dimension_insights: dimensionInsights };
}
