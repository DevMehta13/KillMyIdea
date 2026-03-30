/**
 * POST /api/pipeline/interpret-signals — Step 4: Interpret collected signals.
 * Now also passes clarification answers to the LLM for holistic evaluation.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { pipelineStepSchema } from '@/lib/utils/validators';
import { updateRunStatus, failRun, getRunData, markStepCompleted } from '@/lib/pipeline/orchestrator';
import { interpretSignals } from '@/lib/pipeline/steps/04-interpret-signals';
import type { StructuredSummary, IdeaCategory } from '@/types/database';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';
import { verifyRunOwnership } from '@/lib/pipeline/ownership';

export async function POST(request: Request) {
  let runId: string | undefined;

  try {
    const body = await request.json();
    const parsed = pipelineStepSchema.parse(body);
    runId = parsed.run_id;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'pipeline_interpret_signals', RATE_LIMIT_TIERS.pipelineStep);
    if (rateLimitResponse) return rateLimitResponse;

    // Ownership check — verify run belongs to this user (BUG-002 fix)
    const isOwner = await verifyRunOwnership(runId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'forbidden', message: 'This analysis run does not belong to you' },
        { status: 403 }
      );
    }

    const run = await getRunData(runId);
    const snapshot = run.input_snapshot as Record<string, unknown>;

    await updateRunStatus(runId, 'interpreting_signals', 4);

    const admin = createAdminClient();

    // Get signals
    const { data: signals } = await admin
      .from('signal_evidence')
      .select('*')
      .eq('analysis_run_id', runId);

    const signalResults = (signals ?? []).map((s: Record<string, unknown>) => ({
      source_type: s.source_type as string,
      signal_category: s.signal_category as string | null,
      raw_data: s.raw_data as Record<string, unknown>,
      normalized_summary: s.normalized_summary as string | null,
      source_url: s.source_url as string | null,
    }));

    // Get clarification answers from idea version
    let clarificationAnswers: { question_id: string; answer: string }[] | null = null;
    const { data: version } = await admin
      .from('idea_versions')
      .select('clarification_answers')
      .eq('id', run.idea_version_id)
      .single();

    if (version?.clarification_answers) {
      clarificationAnswers = version.clarification_answers as { question_id: string; answer: string }[];
    }

    // Build interpretation from snapshot
    const interpretation: StructuredSummary = (snapshot.interpretation as StructuredSummary) ?? {
      problem: (snapshot.raw_input as string) ?? '',
      solution: '',
      target_user: (snapshot.target_user as string) ?? '',
      business_model: '',
      key_assumptions: [],
      vagueness_flags: [],
      vagueness_score: 0.5,
    };

    const category = ((snapshot.category as string) ?? 'other') as IdeaCategory;

    // Run step 4 with all evidence sources
    const result = await interpretSignals({
      run_id: runId,
      interpretation,
      category,
      signals: signalResults,
      clarification_answers: clarificationAnswers,
    } as Parameters<typeof interpretSignals>[0] & { clarification_answers: typeof clarificationAnswers });

    // Store dimension insights in snapshot for Step 5
    await admin
      .from('analysis_runs')
      .update({
        input_snapshot: { ...snapshot, dimension_insights: result.dimension_insights },
      })
      .eq('id', runId);

    // Mark step 4 completed (DEC-024)
    await markStepCompleted(runId, 4);

    return NextResponse.json({
      status: 'interpreting_signals',
      dimension_insights: result.dimension_insights,
    });
  } catch (error) {
    if (runId) await failRun(runId, (error as Error).message);
    return NextResponse.json({ error: 'pipeline_error', message: (error as Error).message }, { status: 500 });
  }
}
