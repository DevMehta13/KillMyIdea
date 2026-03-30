/**
 * POST /api/admin/jobs/[runId]/retry — Reset a failed analysis run to queued
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
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

    const { runId } = await params;

    const { error } = await admin
      .from('analysis_runs')
      .update({
        status: 'queued',
        error: null,
        current_step: null,
      })
      .eq('id', runId);

    if (error) {
      return NextResponse.json(
        { error: 'db_error', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'queued' });
  } catch (e) {
    return NextResponse.json(
      { error: 'internal_error', message: (e as Error).message },
      { status: 500 }
    );
  }
}
