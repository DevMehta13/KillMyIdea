/**
 * GET /api/ideas/[id]/report — Get the latest completed report
 * See API_CONTRACTS.md → Analysis Pipeline Module
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';

export async function GET(
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

    const rateLimitResponse = await applyUserRateLimit(user.id, 'read_report', RATE_LIMIT_TIERS.read);
    if (rateLimitResponse) return rateLimitResponse;

    const admin = createAdminClient();
    const url = new URL(request.url);
    const runId = url.searchParams.get('run_id');
    const isPreview = url.searchParams.get('preview') === 'true';

    // Get report
    let query = admin
      .from('reports')
      .select('*, analysis_runs(*)')
      .eq('idea_id', ideaId);

    if (runId) {
      query = query.eq('analysis_run_id', runId);
    }

    const { data: report } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'not_found', message: 'No completed report found' }, { status: 404 });
    }

    // Preview mode (DEC-023): return limited data for teaser/upsell
    if (isPreview) {
      const run = report.analysis_runs as Record<string, unknown> | null;
      return NextResponse.json({
        verdict: run?.verdict ?? null,
        overall_score: run?.overall_score ?? null,
        available_sections: [
          'executive_summary',
          'verdict',
          'dimension_reasoning',
          'assumptions',
          'flags',
          'next_steps',
          'evidence',
        ],
        requires_credits: true,
      });
    }

    // Get signal evidence
    const { data: signals } = await admin
      .from('signal_evidence')
      .select('*')
      .eq('analysis_run_id', report.analysis_run_id);

    return NextResponse.json({
      report_id: report.id,
      report: report.content,
      analysis_run: report.analysis_runs,
      signals: signals ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
