/**
 * POST /api/quick-roast
 * Public endpoint — no auth required. IP rate limited (3/hour).
 * Calls Gemini Flash (with Groq fallback) and stores result in Supabase.
 * See API_CONTRACTS.md → Quick Roast Module.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { quickRoastSchema } from '@/lib/utils/validators';
import { sanitizeForLLM } from '@/lib/utils/sanitize';
import { callWithFallback } from '@/lib/pipeline/ai/retry';
import { checkIpRateLimit } from '@/lib/pipeline/ai/rate-limiter';
import { createAdminClient } from '@/lib/supabase/server';
import { QUICK_ROAST_RATE_LIMIT } from '@/lib/constants';
import type { QuickRoastTeaser } from '@/types/database';
import { logger } from '@/lib/logger';

const SYSTEM_PROMPT = `You are a brutally honest startup advisor. You evaluate ideas with harsh but constructive feedback.
You do NOT give encouragement or false hope. You point out real flaws.
You must respond with valid JSON matching this exact shape:
{
  "first_impression": "2-3 sentences of your harsh but constructive first reaction",
  "biggest_flaw": "1 sentence identifying the single biggest flaw",
  "what_to_clarify": "1 question the founder must answer before this idea can be properly evaluated"
}`;

export async function POST(request: NextRequest) {
  try {
    // ─── Parse and validate input ──────────────────────────────────────
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'invalid_input', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const parsed = quickRoastSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues ?? [];
      return NextResponse.json(
        { error: 'validation_error', message: issues[0]?.message ?? 'Invalid input', details: issues },
        { status: 400 }
      );
    }

    // ─── Rate limiting (IP-based, DB-backed) ───────────────────────────
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';

    const rateCheck = await checkIpRateLimit(
      ip,
      QUICK_ROAST_RATE_LIMIT.maxRequests,
      QUICK_ROAST_RATE_LIMIT.windowMs
    );

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many requests. Try again later.', retryAfter: rateCheck.retryAfter },
        { status: 429 }
      );
    }

    // ─── Call LLM (Gemini Flash → Groq fallback) ───────────────────────
    const { text: llmResponse, model } = await callWithFallback({
      prompt: `Evaluate this startup idea:\n\n"${sanitizeForLLM(parsed.data.idea)}"`,
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.8,
      maxTokens: 1024,
    });

    let roast: QuickRoastTeaser;
    try {
      roast = JSON.parse(llmResponse);
      // Basic shape validation
      if (!roast.first_impression || !roast.biggest_flaw || !roast.what_to_clarify) {
        throw new Error('Missing required fields in LLM response');
      }
    } catch {
      return NextResponse.json(
        { error: 'llm_parse_error', message: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      );
    }

    // ─── Store in Supabase (using admin client to bypass RLS) ──────────
    const supabase = createAdminClient();

    // Create idea row
    const { data: idea, error: ideaError } = await supabase
      .from('ideas')
      .insert({
        title: parsed.data.idea.slice(0, 100),
        raw_input: parsed.data.idea,
        status: 'completed',
        is_quick_roast: true,
        user_id: null,
      })
      .select('id')
      .single();

    if (ideaError) {
      logger.error('Failed to store Quick Roast idea', ideaError, { action: 'quick_roast_store' });
      // Still return the roast even if storage fails
      return NextResponse.json({ id: null, roast });
    }

    // Create a minimal analysis run for the report FK
    const { data: ideaVersion } = await supabase
      .from('idea_versions')
      .insert({
        idea_id: idea.id,
        version_number: 1,
        clarification_status: 'skipped',
      })
      .select('id')
      .single();

    const { data: analysisRun } = await supabase
      .from('analysis_runs')
      .insert({
        idea_id: idea.id,
        idea_version_id: ideaVersion!.id,
        status: 'completed',
        input_snapshot: { title: parsed.data.idea.slice(0, 100), raw_input: parsed.data.idea, target_user: null, problem_statement: null, category: null, clarification_answers: null },
        model_used: model,
      })
      .select('id')
      .single();

    // Create report row
    await supabase
      .from('reports')
      .insert({
        analysis_run_id: analysisRun!.id,
        idea_id: idea.id,
        report_type: 'quick_roast',
        content: {},
        quick_roast_teaser: roast,
      });

    return NextResponse.json({ id: idea.id, roast });
  } catch (error) {
    logger.error('Quick Roast error', error, { action: 'quick_roast' });
    return NextResponse.json(
      { error: 'internal_error', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
