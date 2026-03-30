/**
 * POST /api/pipeline/score — Step 5: Deterministic weighted scoring.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { pipelineStepSchema } from '@/lib/utils/validators';
import { updateRunStatus, failRun, getRunData, markStepCompleted } from '@/lib/pipeline/orchestrator';
import { score } from '@/lib/pipeline/steps/05-score';
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

    const rateLimitResponse = await applyUserRateLimit(user.id, 'pipeline_score', RATE_LIMIT_TIERS.pipelineStep);
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

    // Update status to scoring
    await updateRunStatus(runId, 'scoring', 5);

    // Run step 5
    const result = await score({
      run_id: runId,
      dimension_insights: run.input_snapshot.dimension_insights ?? [],
      category: run.input_snapshot.category,
    });

    // Update analysis_run with scores and overall_score
    const admin = createAdminClient();
    await admin
      .from('analysis_runs')
      .update({
        scores: result.scores,
        overall_score: result.overall_score,
      })
      .eq('id', runId);

    // Mark step 5 completed (DEC-024)
    await markStepCompleted(runId, 5);

    return NextResponse.json({
      status: 'scoring',
      scores: result.scores,
      overall_score: result.overall_score,
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
