/**
 * POST /api/pipeline/interpret — Step 1: Interpret raw idea input.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { pipelineStepSchema } from '@/lib/utils/validators';
import { updateRunStatus, failRun, getRunData, markStepCompleted } from '@/lib/pipeline/orchestrator';
import { interpret } from '@/lib/pipeline/steps/01-interpret';
import { checkVaguenessGate } from '@/lib/pipeline/vagueness-gate';
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

    const rateLimitResponse = await applyUserRateLimit(user.id, 'pipeline_interpret', RATE_LIMIT_TIERS.pipelineStep);
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

    // Update status to interpreting
    await updateRunStatus(runId, 'interpreting', 1);

    // Run step 1 (DEC-025: pass preserved category if available)
    const result = await interpret({
      run_id: runId,
      raw_input: run.input_snapshot.raw_input,
      target_user: run.input_snapshot.target_user ?? null,
      problem_statement: run.input_snapshot.problem_statement ?? null,
      preserve_category: run.input_snapshot.preserve_category ?? null,
    });

    // Store category in input_snapshot
    const admin = createAdminClient();
    await admin
      .from('analysis_runs')
      .update({
        input_snapshot: {
          ...run.input_snapshot,
          category: result.category,
          interpretation: result.interpretation,
        },
      })
      .eq('id', runId);

    // Mark step 1 completed (DEC-024)
    await markStepCompleted(runId, 1);

    // Check vagueness gate (DEC-021)
    const vaguenessGate = checkVaguenessGate(
      result.interpretation.vagueness_score ?? 0,
      result.interpretation.vagueness_flags ?? []
    );

    return NextResponse.json({
      status: 'interpreting',
      interpretation: result.interpretation,
      category: result.category,
      vagueness_blocked: vaguenessGate.blocked,
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
