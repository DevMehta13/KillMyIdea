/**
 * GET /api/user/profile — Get current user profile
 * PATCH /api/user/profile — Update profile (display_name only)
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { updateProfileSchema } from '@/lib/utils/validators';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id, email, display_name, role, plan, credit_balance, created_at')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'not_found', message: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', message: 'Invalid input' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from('profiles')
      .update({ display_name: parsed.data.display_name })
      .eq('id', user.id)
      .select('id, email, display_name, role, plan, credit_balance')
      .single();

    if (error) {
      return NextResponse.json({ error: 'db_error', message: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
