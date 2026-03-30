/**
 * GET /api/credits/balance — Get current credit balance
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'read_balance', RATE_LIMIT_TIERS.read);
    if (rateLimitResponse) return rateLimitResponse;

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('credit_balance, plan')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      balance: profile?.credit_balance ?? 0,
      plan: profile?.plan ?? 'free',
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
