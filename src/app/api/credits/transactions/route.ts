/**
 * GET /api/credits/transactions — List credit transaction history
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'read_transactions', RATE_LIMIT_TIERS.read);
    if (rateLimitResponse) return rateLimitResponse;

    const admin = createAdminClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 50);
    const offset = (page - 1) * limit;

    const { data: transactions, count } = await admin
      .from('credit_transactions')
      .select('id, type, amount, balance_after, description, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      transactions: transactions ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
