/**
 * GET /api/admin/metrics — Platform-wide metrics for admin dashboard
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Run all counts in parallel
    const [
      usersResult,
      ideasResult,
      totalAnalysesResult,
      completedResult,
      failedResult,
      verdictResult,
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin
        .from('ideas')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null),
      admin.from('analysis_runs').select('*', { count: 'exact', head: true }),
      admin
        .from('analysis_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      admin
        .from('analysis_runs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed'),
      admin
        .from('analysis_runs')
        .select('verdict')
        .not('verdict', 'is', null),
    ]);

    // Build verdict distribution from raw rows
    const verdictDistribution: Record<string, number> = {};
    if (verdictResult.data) {
      for (const row of verdictResult.data) {
        const v = row.verdict as string;
        verdictDistribution[v] = (verdictDistribution[v] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      total_users: usersResult.count ?? 0,
      total_ideas: ideasResult.count ?? 0,
      total_analyses: totalAnalysesResult.count ?? 0,
      completed_analyses: completedResult.count ?? 0,
      failed_analyses: failedResult.count ?? 0,
      verdict_distribution: verdictDistribution,
      signal_providers: { hackernews: 'active' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'internal_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
