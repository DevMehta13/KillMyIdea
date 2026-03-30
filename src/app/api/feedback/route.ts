/**
 * POST /api/feedback — Submit feedback on analysis quality.
 * Rate limited: 5/hour per user.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { logger } from '@/lib/logger';

const feedbackSchema = z.object({
  analysis_run_id: z.string().uuid().optional(),
  type: z.enum(['inaccurate', 'unhelpful', 'other']),
  message: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'feedback', { maxRequests: 5, windowMs: 60 * 60 * 1000 });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('feedback').insert({
      user_id: user.id,
      analysis_run_id: parsed.data.analysis_run_id ?? null,
      type: parsed.data.type,
      message: parsed.data.message ?? null,
    });

    if (error) {
      logger.error('Failed to save feedback', error, { action: 'feedback_submit' });
      return NextResponse.json({ error: 'db_error', message: 'Failed to save feedback' }, { status: 500 });
    }

    logger.info('Feedback submitted', { action: 'feedback_submit', type: parsed.data.type, userId: user.id });
    return NextResponse.json({ status: 'submitted' }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
