/**
 * GET /api/share/[slug] — Fetch a shared report (no auth required)
 * See API_CONTRACTS.md → Share Module
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { applyIpRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';
import { headers } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
    const rateLimitResponse = await applyIpRateLimit(ip, 'read_shared_report', RATE_LIMIT_TIERS.read);
    if (rateLimitResponse) return rateLimitResponse;

    const admin = createAdminClient();

    // Find the share link
    const { data: shareLink } = await admin
      .from('share_links')
      .select('id, report_id, visibility, expires_at, view_count')
      .eq('slug', slug)
      .single();

    if (!shareLink) {
      return NextResponse.json({ error: 'not_found', message: 'Share link not found' }, { status: 404 });
    }

    // Check expiry
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return NextResponse.json({ error: 'expired', message: 'This share link has expired' }, { status: 410 });
    }

    // Get the report
    const { data: report } = await admin
      .from('reports')
      .select('content, quick_roast_teaser, report_type, idea_id, created_at')
      .eq('id', shareLink.report_id)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'not_found', message: 'Report not found' }, { status: 404 });
    }

    // Get idea title
    const { data: idea } = await admin
      .from('ideas')
      .select('title')
      .eq('id', report.idea_id)
      .single();

    // Get analysis run for scores
    const { data: run } = await admin
      .from('analysis_runs')
      .select('verdict, overall_score')
      .eq('idea_id', report.idea_id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get signals for full reports
    let signals: unknown[] = [];
    if (report.report_type === 'full') {
      const { data: signalData } = await admin
        .from('signal_evidence')
        .select('id, source_type, signal_category, normalized_summary, source_url, raw_data')
        .eq('analysis_run_id', shareLink.report_id);
      signals = signalData ?? [];
    }

    // Increment view count
    await admin
      .from('share_links')
      .update({ view_count: (shareLink.view_count ?? 0) + 1 })
      .eq('id', shareLink.id);

    return NextResponse.json({
      report: report.report_type === 'quick_roast' ? report.quick_roast_teaser : report.content,
      idea_title: idea?.title ?? 'Untitled',
      verdict: run?.verdict ?? null,
      overall_score: run?.overall_score ?? null,
      created_at: report.created_at,
      is_quick_roast: report.report_type === 'quick_roast',
      signals,
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
