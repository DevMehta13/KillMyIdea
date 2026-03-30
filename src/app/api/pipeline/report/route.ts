/**
 * POST /api/pipeline/report — Step 7: Generate final analysis report.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { pipelineStepSchema } from '@/lib/utils/validators';
import { updateRunStatus, failRun, getRunData, markStepCompleted } from '@/lib/pipeline/orchestrator';
import { generateReport } from '@/lib/pipeline/steps/07-report';
import { sendAnalysisCompleteEmail } from '@/lib/email/send';
import { applyUserRateLimit } from '@/lib/utils/rate-limit-helper';
import { RATE_LIMIT_TIERS } from '@/lib/constants';
import { verifyRunOwnership } from '@/lib/pipeline/ownership';

export async function POST(request: Request) {
  let runId: string | undefined;

  try {
    const body = await request.json();
    const parsed = pipelineStepSchema.parse(body);
    runId = parsed.run_id;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Sign in required' },
        { status: 401 }
      );
    }

    const rateLimitResponse = await applyUserRateLimit(user.id, 'pipeline_report', RATE_LIMIT_TIERS.pipelineStep);
    if (rateLimitResponse) return rateLimitResponse;

    // Ownership check — verify run belongs to this user (BUG-002 fix)
    const isOwner = await verifyRunOwnership(runId, user.id);
    if (!isOwner) {
      return NextResponse.json(
        { error: 'forbidden', message: 'This analysis run does not belong to you' },
        { status: 403 }
      );
    }

    // Get run data
    const run = await getRunData(runId);

    // Update status to generating_report
    await updateRunStatus(runId, 'generating_report', 7);

    // Get signals from signal_evidence table
    const admin = createAdminClient();
    const { data: signals } = await admin
      .from('signal_evidence')
      .select('*')
      .eq('analysis_run_id', runId);

    const signalResults = (signals ?? []).map((s) => ({
      source_type: s.source_type,
      signal_category: s.signal_category,
      raw_data: s.raw_data as Record<string, unknown>,
      normalized_summary: s.normalized_summary,
      source_url: s.source_url,
    }));

    // Fetch clarification Q&A for report (DEC-026)
    const { data: version } = await admin
      .from('idea_versions')
      .select('clarification_questions, clarification_answers')
      .eq('id', run.idea_version_id)
      .single();

    const clarificationQA = (() => {
      const questions = (version?.clarification_questions ?? []) as { id: string; question: string; dimension: string }[];
      const answers = (version?.clarification_answers ?? []) as { question_id: string; answer: string }[];
      if (!answers.length) return undefined;

      const answerMap = new Map(answers.map((a) => [a.question_id, a.answer]));
      return questions
        .filter((q) => answerMap.has(q.id))
        .map((q) => ({
          question: q.question,
          answer: answerMap.get(q.id)!,
          dimension: q.dimension as import('@/types/database').SignalCategory,
        }));
    })();

    // Run step 7
    const result = await generateReport({
      run_id: runId,
      input_snapshot: run.input_snapshot,
      interpretation: run.input_snapshot.interpretation,
      scores: run.scores,
      overall_score: run.overall_score,
      verdict: run.verdict,
      assumptions: run.input_snapshot.interpretation?.key_assumptions?.map(
        (text: string) => ({ text, type: 'inferred' as const, source: 'interpretation' })
      ) ?? [],
      red_flags: [],
      green_flags: [],
      signals: signalResults,
      clarification_qa: clarificationQA,
    });

    // Create report row in reports table
    const { data: report } = await admin
      .from('reports')
      .insert({
        analysis_run_id: runId,
        idea_id: run.idea_id,
        content: result.report,
      })
      .select('id')
      .single();

    const reportId = report?.id ?? '';

    // Mark step 7 completed (DEC-024)
    await markStepCompleted(runId, 7);

    // Update analysis_run status to completed
    await updateRunStatus(runId, 'completed', 7);

    // Update idea status to completed
    await admin
      .from('ideas')
      .update({ status: 'completed' })
      .eq('id', run.idea_id);

    // Send email notification (DEC-030) — fire-and-forget
    const { data: profile } = await admin
      .from('profiles')
      .select('email, display_name, email_notifications')
      .eq('id', user.id)
      .single();

    if (profile?.email && profile.email_notifications !== false) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://killmyidea.com';
      sendAnalysisCompleteEmail({
        to: profile.email,
        userName: profile.display_name ?? 'there',
        ideaTitle: run.input_snapshot.title ?? 'Your idea',
        verdict: result.report.verdict?.verdict ?? run.verdict ?? 'insufficient_data',
        score: result.report.verdict?.score ?? run.overall_score ?? 0,
        reportUrl: `${appUrl}/ideas/${run.idea_id}/report/${runId}`,
      }).catch(() => {}); // Already handles errors internally
    }

    return NextResponse.json({
      status: 'completed',
      report_id: reportId,
      report: result.report,
    });
  } catch (error) {
    if (runId) {
      await failRun(runId, (error as Error).message);
    }
    return NextResponse.json(
      { error: 'pipeline_error', message: (error as Error).message },
      { status: 500 }
    );
  }
}
