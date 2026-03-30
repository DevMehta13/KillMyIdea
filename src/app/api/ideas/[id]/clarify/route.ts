/**
 * POST /api/ideas/[id]/clarify — Submit clarification answers
 * See API_CONTRACTS.md → Clarification
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { submitClarificationSchema } from '@/lib/utils/validators';
import { sanitizeInput } from '@/lib/utils/sanitize';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';

export async function POST(
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

    const rateLimitResponse = await applyUserRateLimit(user.id, 'write_clarify', RATE_LIMIT_TIERS.write);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => null);
    const parsed = submitClarificationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Sanitize answers (DEC-031)
    const sanitizedAnswers = parsed.data.skip
      ? null
      : parsed.data.answers.map((a) => ({
          question_id: a.question_id,
          answer: sanitizeInput(a.answer),
        }));

    // Update idea version with answers
    await admin
      .from('idea_versions')
      .update({
        clarification_answers: sanitizedAnswers,
        clarification_status: parsed.data.skip ? 'skipped' : 'answered',
      })
      .eq('id', parsed.data.version_id);

    return NextResponse.json({ status: 'collecting_signals', version_id: parsed.data.version_id });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
