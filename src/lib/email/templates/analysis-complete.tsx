/**
 * Analysis complete email template (DEC-030).
 * Plain text email — no React Email dependency needed.
 * Includes verdict, score, and link to report.
 */

import type { Verdict } from '@/types/database';

const VERDICT_LABELS: Record<Verdict, string> = {
  pursue: 'Pursue',
  refine: 'Refine',
  test_first: 'Test First',
  drop: 'Drop',
  insufficient_data: 'Insufficient Data',
};

interface AnalysisCompleteEmailProps {
  userName: string;
  ideaTitle: string;
  verdict: Verdict;
  score: number;
  reportUrl: string;
}

export function buildAnalysisCompleteEmail(props: AnalysisCompleteEmailProps) {
  const verdictLabel = VERDICT_LABELS[props.verdict] ?? props.verdict;

  const subject = `Your analysis is ready: ${verdictLabel} (${props.score.toFixed(1)}/10)`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <div style="background-color: #1E3A5F; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; font-size: 16px; margin: 0; letter-spacing: 1px;">KILL MY IDEA</h1>
  </div>

  <div style="border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 16px; color: #333;">Hi ${props.userName},</p>

    <p style="margin: 0 0 8px; color: #333;">Your analysis for <strong>${props.ideaTitle}</strong> is complete.</p>

    <div style="background: #f5f5f5; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 14px; color: #666;">Verdict</p>
      <p style="margin: 0; font-size: 24px; font-weight: bold; color: #1E3A5F;">${verdictLabel}</p>
      <p style="margin: 4px 0 0; font-size: 18px; color: #666;">${props.score.toFixed(1)}/10</p>
    </div>

    <a href="${props.reportUrl}" style="display: block; background-color: #1E3A5F; color: #fff; text-align: center; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0;">
      View Full Report
    </a>

    <p style="margin: 16px 0 0; font-size: 12px; color: #999;">
      You received this email because you ran an analysis on Kill My Idea.
    </p>
  </div>
</div>`.trim();

  return { subject, html };
}
