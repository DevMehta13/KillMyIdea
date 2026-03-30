/**
 * POST /api/pipeline/signals — Step 3: Collect external signals.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { pipelineStepSchema } from '@/lib/utils/validators';
import { updateRunStatus, failRun, getRunData, markStepCompleted } from '@/lib/pipeline/orchestrator';
import { collectSignals } from '@/lib/pipeline/steps/03-collect-signals';
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

    const rateLimitResponse = await applyUserRateLimit(user.id, 'pipeline_signals', RATE_LIMIT_TIERS.pipelineStep);
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

    // Enforce vagueness gate (DEC-021)
    const interpretation = run.input_snapshot.interpretation;
    if (interpretation) {
      const gate = checkVaguenessGate(
        interpretation.vagueness_score ?? 0,
        interpretation.vagueness_flags ?? []
      );
      if (gate.blocked) {
        // Check if user completed clarification (not skipped)
        const admin2 = createAdminClient();
        const { data: version } = await admin2
          .from('idea_versions')
          .select('clarification_status')
          .eq('idea_id', run.idea_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!version || version.clarification_status !== 'answered') {
          return NextResponse.json(
            {
              error: 'vagueness_blocked',
              message: 'Idea is too vague. Complete clarification before proceeding.',
              vagueness_score: gate.vagueness_score,
              threshold: gate.threshold,
            },
            { status: 400 }
          );
        }
      }
    }

    // Update status to collecting_signals
    await updateRunStatus(runId, 'collecting_signals', 3);

    // Run step 3
    const result = await collectSignals({
      run_id: runId,
      interpretation: run.input_snapshot.interpretation,
      category: run.input_snapshot.category,
      clarification_answers: run.input_snapshot.clarification_answers ?? null,
    });

    // Store each signal in signal_evidence table
    const admin = createAdminClient();
    if (result.signals.length > 0) {
      const signalRows = result.signals.map((signal) => ({
        analysis_run_id: runId,
        source_type: signal.source_type,
        signal_category: signal.signal_category,
        raw_data: signal.raw_data,
        normalized_summary: signal.normalized_summary,
        source_url: signal.source_url,
      }));

      await admin.from('signal_evidence').insert(signalRows);
    }

    // Mark step 3 completed (DEC-024)
    await markStepCompleted(runId, 3);

    return NextResponse.json({
      status: 'collecting_signals',
      signals_collected: result.signals_collected,
      sources_used: result.sources_used,
      sources_failed: result.sources_failed,
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
