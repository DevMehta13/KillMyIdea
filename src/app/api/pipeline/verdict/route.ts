/**
 * POST /api/pipeline/verdict — Step 6: Determine verdict with logic overrides.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { pipelineStepSchema } from '@/lib/utils/validators';
import { updateRunStatus, failRun, getRunData, markStepCompleted } from '@/lib/pipeline/orchestrator';
import { verdict } from '@/lib/pipeline/steps/06-verdict';
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

    const rateLimitResponse = await applyUserRateLimit(user.id, 'pipeline_verdict', RATE_LIMIT_TIERS.pipelineStep);
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

    // Update status to generating_verdict
    await updateRunStatus(runId, 'generating_verdict', 6);

    // Run step 6
    const result = await verdict({
      run_id: runId,
      scores: run.scores,
      overall_score: run.overall_score,
    });

    // Update analysis_run with verdict data
    const admin = createAdminClient();
    await admin
      .from('analysis_runs')
      .update({
        verdict: result.verdict,
        override_applied: result.override_applied,
        override_reason: result.override_reason,
      })
      .eq('id', runId);

    // Mark step 6 completed (DEC-024)
    await markStepCompleted(runId, 6);

    return NextResponse.json({
      status: 'generating_verdict',
      verdict: result.verdict,
      raw_verdict: result.raw_verdict,
      override_applied: result.override_applied,
      override_reason: result.override_reason,
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
