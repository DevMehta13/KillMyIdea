'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { VerdictBanner } from '@/components/report/verdict-banner';
import { PursueWarning } from '@/components/report/pursue-warning';
import { SubScoreGrid } from '@/components/report/sub-score-grid';
import { ReasoningSection } from '@/components/report/reasoning-section';
import { AssumptionsPanel } from '@/components/report/assumptions-panel';
import { FlagsList } from '@/components/report/flags-list';
import { EvidenceExplorer } from '@/components/report/evidence-explorer';
import { NextStepsPanel } from '@/components/report/next-steps-panel';
import type { ReportContent } from '@/types/database';
import { Zap } from 'lucide-react';

interface SharedData {
  report: ReportContent;
  idea_title: string;
  verdict: string;
  overall_score: number;
  created_at: string;
  is_quick_roast: boolean;
  signals: { id: string; source_type: string; signal_category: string | null; normalized_summary: string | null; source_url: string | null; raw_data: Record<string, unknown> }[];
}

export default function PublicReportPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/share/${shareId}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 410 ? 'This link has expired' : 'Report not found');
        return res.json();
      })
      .then((d) => { setData(d); setIsLoading(false); })
      .catch((e) => { setError(e.message); setIsLoading(false); });
  }, [shareId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Report not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const report = data.report;
  const verdictStr = report?.verdict?.verdict ?? data.verdict ?? 'insufficient_data';
  const score = report?.verdict?.score ?? data.overall_score ?? 0;
  const confidence = report?.verdict?.confidence ?? 0;
  const oneLiner = report?.verdict?.one_liner ?? report?.executive_summary ?? '';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="text-center mb-4">
        <h1 className="text-lg font-semibold text-muted-foreground">Analysis Report</h1>
        <p className="text-2xl font-bold mt-1">{data.idea_title}</p>
      </div>

      <VerdictBanner verdict={verdictStr} score={score} confidence={confidence} oneLiner={oneLiner} />
      <PursueWarning verdict={verdictStr} />
      {report?.dimension_reasoning && <SubScoreGrid scores={{}} />}
      <ReasoningSection dimensionReasoning={report?.dimension_reasoning ?? []} />
      <AssumptionsPanel assumptions={report?.assumptions ?? []} />
      <FlagsList redFlags={report?.red_flags ?? []} greenFlags={report?.green_flags ?? []} />
      <EvidenceExplorer signals={data.signals ?? []} />
      <NextStepsPanel nextSteps={report?.next_steps ?? []} verdict={verdictStr} />

      {/* CTA Banner */}
      <div className="rounded-lg border-2 p-6 text-center" style={{ borderColor: 'var(--brand-primary)' }}>
        <p className="text-lg font-semibold">Want to analyze your own idea?</p>
        <p className="text-sm text-muted-foreground mt-1">Get a brutally honest verdict with evidence and next steps.</p>
        <Link href="/signup" className="mt-4 inline-block">
          <Button style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white">
            <Zap className="mr-2 h-4 w-4" /> Analyze Your Idea
          </Button>
        </Link>
      </div>
    </div>
  );
}
