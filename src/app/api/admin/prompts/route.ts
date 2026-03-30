/**
 * GET  /api/admin/prompts — List all admin settings
 * PATCH /api/admin/prompts — Upsert an admin setting
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
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

    const { data: settings, error } = await admin
      .from('admin_settings')
      .select('key, value, updated_at');

    if (error) {
      return NextResponse.json(
        { error: 'db_error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: settings ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: 'internal_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
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
    if (!body || typeof body.key !== 'string' || body.value === undefined) {
      return NextResponse.json(
        { error: 'invalid_input', message: 'key (string) and value are required' },
        { status: 400 }
      );
    }

    const { data: setting, error } = await admin
      .from('admin_settings')
      .upsert(
        { key: body.key, value: body.value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      .select('key, value, updated_at')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'db_error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(setting);
  } catch (e) {
    return NextResponse.json(
      { error: 'internal_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
