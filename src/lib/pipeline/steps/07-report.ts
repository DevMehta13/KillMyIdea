/**
 * Step 7: Report — generate a comprehensive analysis report using Gemini Pro.
 *
 * Uses Gemini Pro (via usePro flag) for highest quality narrative output.
 * Validates response with Zod schema.
 * Produces verdict-specific next steps (PRD Section 9.5).
 */

import type { ReportContent, SignalCategory } from '@/types/database';
import type { ReportInput, ReportOutput } from '@/types/pipeline';
import { callWithFallback } from '@/lib/pipeline/ai/retry';
import { SCORING_DIMENSIONS } from '@/lib/constants';
import { safeParseLLMResponse, reportResponseSchema } from '@/lib/pipeline/schemas';

/**
 * Verdict-specific instructions for next_steps.
 * PRD Section 9.5: "Test First" → propose experiments, "Drop" → salvage options,
 * "Refine" → specific improvement areas.
 */
function getVerdictInstructions(verdict: string): string {
  switch (verdict) {
    case 'pursue':
      return `NEXT STEPS for "Pursue" verdict:
- Focus on execution and launch actions
- Suggest specific MVPs, launch channels, and early-adopter acquisition strategies
- Include 1 risk-mitigation step (the biggest remaining unknown)
- Prioritize speed to market`;

    case 'refine':
      return `NEXT STEPS for "Refine" verdict:
- Focus on the 2-3 weakest dimensions that need improvement
- Suggest SPECIFIC changes: narrower ICP, stronger wedge, repositioning, or monetization tweaks
- Each action should directly address a red flag or low-scoring dimension
- Include how the founder can validate each change (talk to N users, run a survey, build a prototype)`;

    case 'test_first':
      return `NEXT STEPS for "Test First" verdict:
- Propose 3-5 SPECIFIC validation experiments, not generic advice
- Examples: "Interview 10 [target user type] about [specific pain point]"
- Examples: "Build a landing page for [specific value prop] and measure signup rate"
- Examples: "Create a waitlist for [feature] and see if [number] people sign up in [timeframe]"
- Examples: "Post in [specific community] describing [the problem] and measure response"
- Each experiment should test one specific assumption from the analysis
- Include success/failure criteria for each experiment`;

    case 'drop':
      return `NEXT STEPS for "Drop" verdict:
- Acknowledge the verdict honestly — do not soften it
- Suggest 1-2 salvage options IF any green flags exist (pivot direction, adjacent problem, different audience)
- If no salvage is viable, say so directly
- Suggest what the founder should explore INSTEAD based on what was learned
- Keep this short — 2-3 actions max`;

    case 'insufficient_data':
      return `NEXT STEPS for "Insufficient Data" verdict:
- Explain exactly WHICH evidence is missing and WHY the system can't give a confident assessment
- Suggest 2-3 specific ways to gather the missing evidence
- Do NOT guess or speculate — be honest about what's unknown
- Recommend re-running the analysis after gathering more data`;

    default:
      return 'Provide 3-5 actionable next steps based on the verdict.';
  }
}

const SYSTEM_PROMPT = `You are writing a startup idea analysis report for a FOUNDER. They are not technical. They don't know what "baselines", "signal_strength", or "confidence scores" mean. Write like a sharp, honest advisor who explains things clearly.

TONE: Direct, specific, evidence-backed. Like a trusted mentor who respects the founder's time. No cheerleading, no corporate fluff, no hedging. If something is weak, say it plainly.

Respond with valid JSON matching this exact shape:
{
  "executive_summary": "2-3 sentence plain-English overview. What did we find? What should the founder do?",
  "idea_interpretation": {
    "problem": "The problem this idea solves, restated clearly",
    "solution": "What the product actually does, in one sentence",
    "target_user": "Who specifically this is for"
  },
  "verdict": {
    "verdict": "pursue|refine|test_first|drop|insufficient_data",
    "score": 0.0,
    "confidence": 0.0,
    "one_liner": "One memorable, honest sentence a founder would screenshot and share"
  },
  "dimension_reasoning": [
    {
      "dimension": "demand",
      "score": 0.0,
      "reasoning": "Plain-English explanation. Reference specific evidence (HN posts, search results, trends data, founder's answers). Never mention internal scoring terms.",
      "evidence_refs": ["real URL or '[Unverified] description'"]
    }
  ],
  "assumptions": [
    {"text": "Plain statement of what we assumed", "type": "user_stated|inferred", "source": "Where this came from"}
  ],
  "red_flags": [
    {"text": "Clear, specific risk the founder needs to know about", "severity": "high|medium|low", "evidence_ref": "URL or description"}
  ],
  "green_flags": [
    {"text": "Clear, specific strength that supports the idea", "strength": "strong|moderate", "evidence_ref": "URL or description"}
  ],
  "next_steps": [
    {"action": "Specific, actionable step the founder can take this week", "priority": 1, "type": "test|refine|validate|build"}
  ],
  "weaknesses": "What's weak about this idea right now, explained plainly",
  "strengthening_suggestions": "Concrete changes that would make this idea stronger"
}

WRITING RULES:
- dimension_reasoning MUST include all 7 dimensions: ${SCORING_DIMENSIONS.join(', ')}
- NEVER use words like "baseline", "signal_strength", "confidence score", "dimension", "weight", or any internal scoring jargon
- NEVER write things like "Baseline 0.60" or "signal_strength = 0.7" — these mean nothing to a founder
- DO write like: "We found 5 HackerNews threads discussing this exact problem, with the most popular getting 150+ upvotes — that's strong community validation"
- DO write like: "Google search results show 3 established competitors in this space, all with pricing pages — the market exists but you'll need to differentiate"
- DO write like: "We couldn't find evidence that people are actively looking for solutions to this problem right now"
- Red flags should be things like: "No existing competitors found — this could mean the market doesn't exist, not that you're first"
- Green flags should be things like: "Rising Google Trends interest (+45% over 12 months) suggests growing demand"
- Assumptions should be things like: "You said your target users are engineering managers at mid-size companies" (user_stated) or "We assumed the product would be priced as a monthly subscription" (inferred)
- next_steps should be things a founder can literally do: "Interview 10 engineering managers about how they currently handle async standups" — not "validate demand"

EVIDENCE RULES:
- evidence_refs MUST use real URLs from the signals when available
- If a claim comes from LLM analysis (no real URL), prefix with "[Unverified] "
- NEVER fake a URL. If you don't have one, use "[Unverified] Based on market analysis"
- Prefer claims backed by real URLs over unverified ones`;

export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  const scoresBlock = SCORING_DIMENSIONS.map((dim) => {
    const s = input.scores[dim as keyof typeof input.scores];
    return `  ${dim}: score=${s.score}, weight=${s.weight}, confidence=${s.confidence}, reasoning="${s.reasoning}"`;
  }).join('\n');

  const signalsSummary = input.signals.length > 0
    ? input.signals.map((s, idx) => {
        const data = s.raw_data as Record<string, unknown>;
        const parts = [`  ${idx + 1}. [${s.source_type}/${s.signal_category ?? 'general'}]`];
        parts.push(s.normalized_summary ?? 'N/A');
        if (data.points !== undefined) parts.push(`(points: ${data.points}, comments: ${data.num_comments ?? 'N/A'})`);
        if (data.position !== undefined) parts.push(`(position: ${data.position})`);
        if (data.direction !== undefined) parts.push(`(trend: ${data.direction}, growth: ${data.growth_pct ?? 'N/A'}%)`);
        if (s.source_url) parts.push(`URL: ${s.source_url}`);
        return parts.join(' ');
      }).join('\n')
    : '  No external signals collected.';

  const assumptionsBlock = input.assumptions.length > 0
    ? input.assumptions.map((a) => `  - [${a.type}] ${a.text} (source: ${a.source})`).join('\n')
    : '  No assumptions recorded.';

  const redFlagsBlock = input.red_flags.length > 0
    ? input.red_flags.map((f) => `  - [${f.severity}] ${f.text}`).join('\n')
    : '  None identified yet.';

  const greenFlagsBlock = input.green_flags.length > 0
    ? input.green_flags.map((f) => `  - [${f.strength}] ${f.text}`).join('\n')
    : '  None identified yet.';

  // Verdict-specific next steps instructions
  const verdictInstructions = getVerdictInstructions(input.verdict);

  const userPrompt = `## Input
Title: ${input.input_snapshot.title}
Raw input: ${input.input_snapshot.raw_input}
Target user: ${input.input_snapshot.target_user ?? 'Not specified'}
Problem: ${input.input_snapshot.problem_statement ?? 'Not specified'}

## Interpretation
Problem: ${input.interpretation.problem}
Solution: ${input.interpretation.solution}
Target user: ${input.interpretation.target_user}
Business model: ${input.interpretation.business_model}
Vagueness score: ${input.interpretation.vagueness_score}

## Dimension Scores (Overall: ${input.overall_score}/10)
${scoresBlock}

## Verdict: ${input.verdict}

## External Signals
${signalsSummary}

## Assumptions
${assumptionsBlock}

## Red Flags (from earlier analysis)
${redFlagsBlock}

## Green Flags (from earlier analysis)
${greenFlagsBlock}

## Founder's Clarification Answers
${input.clarification_qa && input.clarification_qa.length > 0
    ? input.clarification_qa.map((qa) => `  Q [${qa.dimension}]: ${qa.question}\n  A: ${qa.answer}`).join('\n\n')
    : '  No clarification answers provided (skipped).'}

## ${verdictInstructions}

Generate the full analysis report. Include the clarification Q&A in the clarification_qa field of the report.`;

  // Use Gemini Pro for highest quality report generation
  const result = await callWithFallback(
    {
      prompt: userPrompt,
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.5,
      maxTokens: 4096,
    },
    { usePro: true }
  );

  // Validate LLM response with Zod schema
  const validated = safeParseLLMResponse(
    result.text,
    reportResponseSchema,
    'Step 7: Report'
  );

  // Build ReportContent from validated data
  const report: ReportContent = {
    ...validated,
    // Ensure dimension_reasoning covers all 7 dimensions
    dimension_reasoning: ensureAllDimensions(validated.dimension_reasoning, input),
  };

  // Inject clarification Q&A into report (DEC-026)
  // Use the original input data, not the LLM's interpretation of it
  if (input.clarification_qa && input.clarification_qa.length > 0) {
    report.clarification_qa = input.clarification_qa;
  }

  return {
    report_id: '', // Filled by the pipeline orchestrator
    report,
  };
}

/**
 * Ensure all 7 dimensions are covered in dimension_reasoning.
 * If the LLM missed any, fill from scoring data.
 */
function ensureAllDimensions(
  reasoning: ReportContent['dimension_reasoning'],
  input: ReportInput
): ReportContent['dimension_reasoning'] {
  const covered = new Set(reasoning.map((d) => d.dimension));
  const result = [...reasoning];

  for (const dim of SCORING_DIMENSIONS) {
    if (!covered.has(dim as SignalCategory)) {
      const s = input.scores[dim as keyof typeof input.scores];
      result.push({
        dimension: dim as SignalCategory,
        score: s.score,
        reasoning: s.reasoning,
        evidence_refs: [],
      });
    }
  }

  return result;
}
