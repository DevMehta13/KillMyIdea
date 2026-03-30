/**
 * GET /api/ideas/[id] — Get idea detail with versions and analysis runs
 * PATCH /api/ideas/[id] — Update an idea
 * DELETE /api/ideas/[id] — Soft-delete an idea
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateIdeaSchema } from '@/lib/utils/validators';
import { checkUserRateLimit } from '@/lib/pipeline/ai/rate-limiter';
import { USER_RATE_LIMITS } from '@/lib/constants';
import { sanitizeFields } from '@/lib/utils/sanitize';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: idea } = await admin
      .from('ideas')
      .select('id, title, raw_input, target_user, problem_statement, status, category, created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!idea) {
      return NextResponse.json({ error: 'not_found', message: 'Idea not found' }, { status: 404 });
    }

    const { data: versions } = await admin
      .from('idea_versions')
      .select('id, version_number, clarification_status, created_at')
      .eq('idea_id', id)
      .order('created_at', { ascending: false });

    const { data: analysis_runs } = await admin
      .from('analysis_runs')
      .select('id, status, verdict, overall_score, confidence, created_at, completed_at')
      .eq('idea_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      idea,
      versions: versions ?? [],
      analysis_runs: analysis_runs ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    // Per-user rate limit (DEC-029)
    const rateLimit = await checkUserRateLimit(
      user.id, 'ideaCrud',
      USER_RATE_LIMITS.ideaCrud.maxRequests,
      USER_RATE_LIMITS.ideaCrud.windowMs
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many requests. Try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = updateIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    // Sanitize user text fields (DEC-031)
    const sanitizedData = sanitizeFields(parsed.data, ['title', 'raw_input', 'target_user', 'problem_statement']);

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from('ideas')
      .update(sanitizedData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, title, raw_input, target_user, problem_statement, status, category')
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'not_found', message: 'Idea not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const admin = createAdminClient();
    await admin
      .from('ideas')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json({ message: 'Idea deleted' });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
