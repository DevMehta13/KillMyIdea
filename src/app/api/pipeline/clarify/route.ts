/**
 * POST /api/pipeline/clarify — Step 2: Generate clarification questions.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { pipelineStepSchema } from '@/lib/utils/validators';
import { updateRunStatus, failRun, getRunData, markStepCompleted } from '@/lib/pipeline/orchestrator';
import { clarify } from '@/lib/pipeline/steps/02-clarify';
import { interpret } from '@/lib/pipeline/steps/01-interpret';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';
import { verifyRunOwnership } from '@/lib/pipeline/ownership';

export async function POST(request: Request) {
  let runId: string | undefined;

  try {
    const body = await request.json();
    const parsed = pipelineStepSchema.parse(body);
    runId = parsed.run_id;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Sign in required' },
        { status: 401 }
      );
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'pipeline_clarify', RATE_LIMIT_TIERS.pipelineStep);
    if (rateLimitResponse) return rateLimitResponse;

    // Ownership check — verify run belongs to this user (BUG-002 fix)
    const isOwner = await verifyRunOwnership(runId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'forbidden', message: 'This analysis run does not belong to you' },
        { status: 403 }
      );
    }

    // Get run data
    const run = await getRunData(runId);

    // Extract interpretation from input_snapshot or re-interpret
    let interpretation = run.input_snapshot.interpretation;
    if (!interpretation) {
      const interpretResult = await interpret({
        run_id: runId,
        raw_input: run.input_snapshot.raw_input,
        target_user: run.input_snapshot.target_user ?? null,
        problem_statement: run.input_snapshot.problem_statement ?? null,
      });
      interpretation = interpretResult.interpretation;
    }

    // Update status to clarifying
    await updateRunStatus(runId, 'clarifying', 2);

    // Run step 2
    const result = await clarify({
      run_id: runId,
      interpretation,
    });

    // Store questions in idea_versions table
    const admin = createAdminClient();
    const { data: version } = await admin
      .from('idea_versions')
      .update({
        clarification_questions: result.questions,
        clarification_status: 'pending',
      })
      .eq('id', run.idea_version_id)
      .select('id')
      .single();

    const versionId = version?.id ?? run.idea_version_id;

    // Mark step 2 completed (DEC-024)
    await markStepCompleted(runId, 2);

    return NextResponse.json({
      status: 'clarifying',
      questions: result.questions,
      version_id: versionId,
    });
  } catch (error) {
    if (runId) {
      await failRun(runId, (error as Error).message);
    }
    return NextResponse.json(
      { error: 'pipeline_error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
