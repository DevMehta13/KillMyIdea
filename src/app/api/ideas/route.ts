/**
 * POST /api/ideas — Create a new idea
 * GET /api/ideas — List user's ideas
 * See API_CONTRACTS.md → Ideas Module
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createIdeaSchema } from '@/lib/utils/validators';
import { sanitizeFields } from '@/lib/utils/sanitize';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'write_create_idea', RATE_LIMIT_TIERS.write);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'invalid_input', message: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = createIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    // Sanitize user text fields (DEC-031)
    const clean = sanitizeFields(parsed.data, ['title', 'raw_input', 'target_user', 'problem_statement']);

    const admin = createAdminClient();
    const { data: idea, error } = await admin
      .from('ideas')
      .insert({
        user_id: user.id,
        title: clean.title,
        raw_input: clean.raw_input,
        target_user: clean.target_user ?? null,
        problem_statement: clean.problem_statement ?? null,
        status: 'draft',
      })
      .select('id, title, status, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
    }

    return NextResponse.json(idea, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: ideas, error } = await admin
      .from('ideas')
      .select('id, title, status, category, is_quick_roast, created_at, updated_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ideas: ideas ?? [], total: ideas?.length ?? 0, page: 1, limit: 50 });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
