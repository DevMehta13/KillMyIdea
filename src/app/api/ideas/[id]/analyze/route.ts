/**
 * POST /api/ideas/[id]/analyze — Start a new analysis. Deducts 1 credit.
 * See API_CONTRACTS.md → Analysis Pipeline Module
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getPreservedCategory } from '@/lib/pipeline/category-preservation';
import { checkUserRateLimit } from '@/lib/pipeline/ai/rate-limiter';
import { USER_RATE_LIMITS } from '@/lib/constants';
import { sanitizeForLLM } from '@/lib/utils/sanitize';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ideaId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    // Per-user rate limit (DEC-029)
    const rateLimit = await checkUserRateLimit(
      user.id,
      'analysis',
      USER_RATE_LIMITS.analysis.maxRequests,
      USER_RATE_LIMITS.analysis.windowMs
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many analyses. Try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    const admin = createAdminClient();

    // Verify idea ownership
    const { data: idea } = await admin
      .from('ideas')
      .select('id, title, raw_input, target_user, problem_statement, category, user_id')
      .eq('id', ideaId)
      .single();

    if (!idea || idea.user_id !== user.id) {
      return NextResponse.json({ error: 'not_found', message: 'Idea not found' }, { status: 404 });
    }

    // Check credit balance
    const { data: profile } = await admin
      .from('profiles')
      .select('credit_balance')
      .eq('id', user.id)
      .single();

    if (!profile || profile.credit_balance < 1) {
      return NextResponse.json(
        { error: 'insufficient_credits', message: 'You need at least 1 credit', balance: profile?.credit_balance ?? 0 },
        { status: 402 }
      );
    }

    // Check category preservation (DEC-025)
    const preservedCategory = await getPreservedCategory(ideaId, {
      title: idea.title,
      raw_input: idea.raw_input,
      problem_statement: idea.problem_statement,
    });

    // Create idea version
    const { data: version } = await admin
      .from('idea_versions')
      .insert({
        idea_id: ideaId,
        version_number: 1,
        clarification_status: 'pending',
      })
      .select('id')
      .single();

    // Create analysis run
    const { data: run, error: runError } = await admin
      .from('analysis_runs')
      .insert({
        idea_id: ideaId,
        idea_version_id: version!.id,
        status: 'queued',
        input_snapshot: {
          title: sanitizeForLLM(idea.title),
          raw_input: sanitizeForLLM(idea.raw_input),
          target_user: idea.target_user ? sanitizeForLLM(idea.target_user) : null,
          problem_statement: idea.problem_statement ? sanitizeForLLM(idea.problem_statement) : null,
          category: idea.category,
          preserve_category: preservedCategory,
          clarification_answers: null,
        },
        credits_charged: 1,
      })
      .select('id, status')
      .single();

    if (runError) {
      return NextResponse.json({ error: 'db_error', message: runError.message }, { status: 500 });
    }

    // Deduct 1 credit
    await admin.rpc('deduct_credits', {
      p_user_id: user.id,
      p_amount: 1,
      p_description: 'Analysis credit',
      p_analysis_run_id: run!.id,
    });

    // Update idea status
    await admin.from('ideas').update({ status: 'analyzing' }).eq('id', ideaId);

    // Get updated balance
    const { data: updatedProfile } = await admin
      .from('profiles')
      .select('credit_balance')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      run_id: run!.id,
      status: 'queued',
      credits_remaining: updatedProfile?.credit_balance ?? 0,
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
