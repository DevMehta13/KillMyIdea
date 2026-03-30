'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VerdictBanner } from '@/components/report/verdict-banner';
import { PursueWarning } from '@/components/report/pursue-warning';
import { SubScoreGrid } from '@/components/report/sub-score-grid';
import { ReasoningSection } from '@/components/report/reasoning-section';
import { AssumptionsPanel } from '@/components/report/assumptions-panel';
import { FlagsList } from '@/components/report/flags-list';
import { EvidenceExplorer } from '@/components/report/evidence-explorer';
import { NextStepsPanel } from '@/components/report/next-steps-panel';
import { ShareExportBar } from '@/components/report/share-export-bar';
import { ClarificationAnswers } from '@/components/report/clarification-answers';
import { FeedbackButton } from '@/components/report/feedback-button';
import { ReportNav } from '@/components/report/report-nav';
import type { ReportContent } from '@/types/database';

interface ReportData {
  report_id: string;
  report: ReportContent;
  analysis_run: {
    id: string;
    verdict: string;
    overall_score: number;
    confidence: number;
    scores: Record<string, { score: number; weight: number; confidence: number; reasoning: string }>;
  };
  signals: {
    id: string;
    source_type: string;
    signal_category: string | null;
    normalized_summary: string | null;
    source_url: string | null;
    raw_data: Record<string, unknown>;
  }[];
}

export default function ReportPage() {
  const { ideaId, runId } = useParams<{ ideaId: string; runId: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('verdict');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/ideas/${ideaId}/report?run_id=${runId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Report not found');
        return res.json();
      })
      .then((d) => { setData(d); setIsLoading(false); })
      .catch((e) => { setError(e.message); setIsLoading(false); });
  }, [ideaId, runId]);

  // Scroll spy: track which section is visible
  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        setActiveSection(entry.target.id);
      }
    }
  }, []);

  useEffect(() => {
    if (!data || !contentRef.current) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '-10% 0px -80% 0px',
      threshold: 0,
    });
    contentRef.current.querySelectorAll('[data-section]').forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [data, handleIntersect]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Failed to load report.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { report, analysis_run, signals } = data;
  const verdictStr = report.verdict?.verdict ?? analysis_run.verdict ?? 'insufficient_data';
  const score = report.verdict?.score ?? analysis_run.overall_score ?? 0;
  const confidence = report.verdict?.confidence ?? analysis_run.confidence ?? 0;
  const oneLiner = report.verdict?.one_liner ?? report.executive_summary ?? '';
  const hasClarificationAnswers = report.clarification_qa && report.clarification_qa.length > 0;
  const hasAssumptions = report.assumptions && report.assumptions.length > 0;
  const hasFlags = (report.red_flags && report.red_flags.length > 0) || (report.green_flags && report.green_flags.length > 0);
  const hasSignals = signals && signals.length > 0;

  const navItems = [
    { id: 'verdict', label: 'Verdict' },
    { id: 'scores', label: 'Scores' },
    { id: 'reasoning', label: 'Reasoning' },
    ...(hasClarificationAnswers ? [{ id: 'answers', label: 'Your Answers' }] : []),
    ...(hasAssumptions ? [{ id: 'assumptions', label: 'Assumptions' }] : []),
    ...(hasFlags ? [{ id: 'flags', label: 'Flags' }] : []),
    ...(hasSignals ? [{ id: 'evidence', label: 'Evidence' }] : []),
    { id: 'next-steps', label: 'Next Steps' },
  ];

  return (
    <>
      {/* Mobile nav pills — sticky inside <main> scroll */}
      <div className="xl:hidden sticky top-0 z-20 -mx-5 -mt-5 mb-4 sm:-mx-7 sm:-mt-7">
        <ReportNav items={navItems} activeSection={activeSection} verdict={verdictStr} />
      </div>

      <div ref={contentRef} className="flex gap-8 xl:gap-10">
        {/* Desktop sidebar — sticky, stretches with content via min-h-0 parent */}
        <aside className="hidden xl:block w-[148px] shrink-0">
          <div className="sticky top-0 pt-1">
            <ReportNav items={navItems} activeSection={activeSection} verdict={verdictStr} />
          </div>
        </aside>

        {/* Report content */}
        <div className="min-w-0 flex-1 max-w-3xl space-y-10 pb-6">

          <section id="verdict" data-section>
            <VerdictBanner
              verdict={verdictStr}
              score={score}
              confidence={confidence}
              oneLiner={oneLiner}
              executiveSummary={report.executive_summary}
              weaknesses={report.weaknesses}
              strengthenings={report.strengthening_suggestions}
            />
            <PursueWarning verdict={verdictStr} />
          </section>

          <section id="scores" data-section>
            <SectionHeading title="Dimension Scores" subtitle="How your idea performed across 7 evaluation criteria" />
            <SubScoreGrid scores={analysis_run.scores ?? {}} />
          </section>

          <section id="reasoning" data-section>
            <SectionHeading title="Analysis Reasoning" subtitle="Click any dimension to see the detailed explanation" />
            <ReasoningSection dimensionReasoning={report.dimension_reasoning ?? []} />
          </section>

          {hasClarificationAnswers && (
            <section id="answers" data-section>
              <ClarificationAnswers answers={report.clarification_qa!} />
            </section>
          )}

          {hasAssumptions && (
            <section id="assumptions" data-section>
              <AssumptionsPanel assumptions={report.assumptions!} />
            </section>
          )}

          {hasFlags && (
            <section id="flags" data-section>
              <SectionHeading title="Flags" subtitle="Key risks and strengths identified in your idea" />
              <FlagsList redFlags={report.red_flags ?? []} greenFlags={report.green_flags ?? []} />
            </section>
          )}

          {hasSignals && (
            <section id="evidence" data-section>
              <SectionHeading title="Evidence" subtitle="Raw signals collected from external sources" />
              <EvidenceExplorer signals={signals} />
            </section>
          )}

          <section id="next-steps" data-section>
            <NextStepsPanel nextSteps={report.next_steps ?? []} verdict={verdictStr} />
          </section>

          <div className="border-t border-white/[0.08] pt-6">
            <FeedbackButton analysisRunId={runId} />
          </div>
        </div>
      </div>

      {/* Bottom action bar — sticky to the <main> scroll container */}
      <div className="sticky bottom-0 z-20 -mx-5 -mb-5 sm:-mx-7 sm:-mb-7">
        <ShareExportBar
          ideaId={ideaId}
          runId={runId}
          reportId={data.report_id}
          report={report}
          ideaTitle={report.idea_interpretation?.problem?.slice(0, 50) ?? 'Analysis'}
        />
      </div>
    </>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-0.5 text-[13px] text-zinc-500">{subtitle}</p>
    </div>
  );
}
