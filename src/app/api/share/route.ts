/**
 * POST /api/share — Create a public share link for a report
 * See API_CONTRACTS.md → Share Module
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createShareSchema } from '@/lib/utils/validators';
import { nanoid } from 'nanoid';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'write_share', RATE_LIMIT_TIERS.write);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
    const parsed = createShareSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify the user owns the report's idea
    const { data: report } = await admin
      .from('reports')
      .select('id, idea_id, report_type')
      .eq('id', parsed.data.report_id)
      .single();

    if (!report) {
      return NextResponse.json({ error: 'not_found', message: 'Report not found' }, { status: 404 });
    }

    const { data: idea } = await admin
      .from('ideas')
      .select('user_id')
      .eq('id', report.idea_id)
      .single();

    if (!idea || (idea.user_id !== user.id && idea.user_id !== null)) {
      return NextResponse.json({ error: 'forbidden', message: 'Not your report' }, { status: 403 });
    }

    // Check if a share link already exists for this report
    const { data: existing } = await admin
      .from('share_links')
      .select('slug, visibility')
      .eq('report_id', parsed.data.report_id)
      .limit(1)
      .single();

    if (existing) {
      const prefix = report.report_type === 'quick_roast' ? '/roast/' : '/report/';
      return NextResponse.json({
        slug: existing.slug,
        url: `${prefix}${existing.slug}`,
        visibility: existing.visibility,
      }, { status: 200 });
    }

    // Create new share link
    const slug = nanoid(12);
    const { error: insertError } = await admin
      .from('share_links')
      .insert({
        report_id: parsed.data.report_id,
        slug,
        visibility: parsed.data.visibility ?? 'unlisted',
      });

    if (insertError) {
      return NextResponse.json({ error: 'db_error', message: insertError.message }, { status: 500 });
    }

    const prefix = report.report_type === 'quick_roast' ? '/roast/' : '/report/';
    return NextResponse.json({
      slug,
      url: `${prefix}${slug}`,
      visibility: parsed.data.visibility ?? 'unlisted',
    }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
