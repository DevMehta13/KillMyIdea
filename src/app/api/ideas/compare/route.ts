/**
 * POST /api/ideas/compare — Compare 2-4 analyzed ideas
 * See API_CONTRACTS.md → Compare Module
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { compareIdeasSchema } from '@/lib/utils/validators';
import { callWithFallback } from '@/lib/pipeline/ai/retry';
import { SCORING_DIMENSIONS, VERDICT_LABELS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const parsed = compareIdeasSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', message: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch ideas with their latest completed analysis
    const comparison = [];
    for (const ideaId of parsed.data.idea_ids) {
      const { data: idea } = await admin
        .from('ideas')
        .select('id, title')
        .eq('id', ideaId)
        .eq('user_id', user.id)
        .single();

      if (!idea) {
        return NextResponse.json({ error: 'not_found', message: `Idea ${ideaId} not found` }, { status: 404 });
      }

      const { data: run } = await admin
        .from('analysis_runs')
        .select('verdict, overall_score, scores')
        .eq('idea_id', ideaId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!run) {
        return NextResponse.json(
          { error: 'no_analysis', message: `Idea "${idea.title}" has no completed analysis` },
          { status: 400 }
        );
      }

      const scores: Record<string, number> = {};
      const runScores = run.scores as Record<string, { score: number }> | null;
      if (runScores) {
        for (const dim of SCORING_DIMENSIONS) {
          scores[dim] = runScores[dim]?.score ?? 0;
        }
      }

      comparison.push({
        idea_id: idea.id,
        title: idea.title,
        verdict: run.verdict,
        overall_score: run.overall_score,
        scores,
      });
    }

    // Generate AI takeaway
    let takeaway = '';
    try {
      const summaryLines = comparison.map(
        (c) => `- "${c.title}": ${VERDICT_LABELS[c.verdict as keyof typeof VERDICT_LABELS] ?? c.verdict} (${c.overall_score}/10)`
      ).join('\n');

      const { text } = await callWithFallback({
        prompt: `Compare these startup ideas and give a brief, actionable takeaway (3-4 sentences). Which should the founder prioritize and why?\n\n${summaryLines}`,
        systemInstruction: 'You are a brutally honest startup advisor. Be direct and specific. Respond with plain JSON: {"takeaway": "your comparison text"}',
        temperature: 0.7,
        maxTokens: 512,
      });

      const parsed = JSON.parse(text);
      takeaway = parsed.takeaway ?? '';
    } catch {
      takeaway = 'Unable to generate comparison takeaway. Review the scores above to compare.';
    }

    return NextResponse.json({ comparison, takeaway });
  } catch (e) {
    return NextResponse.json({ error: 'internal_error', message: (e as Error).message }, { status: 500 });
  }
}
