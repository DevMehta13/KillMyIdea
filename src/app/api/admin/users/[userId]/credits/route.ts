/**
 * POST /api/admin/users/[userId]/credits — Adjust a user's credit balance
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { adminCreditAdjustmentSchema } from '@/lib/utils/validators';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'invalid_input', message: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const parsed = adminCreditAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { userId } = await params;
    const { amount, description } = parsed.data;

    let rpcResult;

    if (amount >= 0) {
      rpcResult = await admin.rpc('add_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
      });
    } else {
      rpcResult = await admin.rpc('deduct_credits', {
        p_user_id: userId,
        p_amount: Math.abs(amount),
        p_description: description,
      });
    }

    if (rpcResult.error) {
      return NextResponse.json(
        { error: 'db_error', message: rpcResult.error.message },
        { status: 500 }
      );
    }

    // Fetch updated balance
    const { data: updatedProfile } = await admin
      .from('profiles')
      .select('credit_balance')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      new_balance: updatedProfile?.credit_balance ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'internal_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
