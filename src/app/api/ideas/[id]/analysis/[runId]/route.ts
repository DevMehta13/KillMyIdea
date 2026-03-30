/**
 * GET /api/ideas/[id]/analysis/[runId]/status — Poll analysis progress
 * See API_CONTRACTS.md → Analysis Pipeline Module
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TOTAL_PIPELINE_STEPS, RATE_LIMIT_TIERS } from '@/lib/constants';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { runId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'read_analysis_status', RATE_LIMIT_TIERS.read);
    if (rateLimitResponse) return rateLimitResponse;

    const admin = createAdminClient();
    const { data: run } = await admin
      .from('analysis_runs')
      .select('id, status, current_step, completed_steps, started_at, error')
      .eq('id', runId)
      .single();

    if (!run) {
      return NextResponse.json({ error: 'not_found', message: 'Analysis run not found' }, { status: 404 });
    }

    return NextResponse.json({
      run_id: run.id,
      status: run.status,
      current_step: run.current_step,
      total_steps: TOTAL_PIPELINE_STEPS,
      completed_steps: run.completed_steps ?? [],
      started_at: run.started_at,
      error: run.error,
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
