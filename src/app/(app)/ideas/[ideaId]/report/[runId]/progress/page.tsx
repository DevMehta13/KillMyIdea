'use client';

import { useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAnalysisPipeline } from '@/lib/hooks/use-analysis-pipeline';
import { Check, Loader2, X, Circle } from 'lucide-react';

function ProgressContent() {
  const { ideaId, runId } = useParams<{ ideaId: string; runId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumed = searchParams.get('resumed') === 'true';

  const pipeline = useAnalysisPipeline();

  useEffect(() => {
    if (resumed) {
      pipeline.runSignalsToReport(runId);
    } else {
      pipeline.runInterpretAndClarify(runId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pipeline.phase === 'waiting_for_clarification' && pipeline.clarificationQuestions) {
      sessionStorage.setItem(`clarify_${runId}`, JSON.stringify(pipeline.clarificationQuestions));
      const params = new URLSearchParams({
        version_id: pipeline.versionId ?? '',
        run_id: runId,
      });
      if (pipeline.vaguenessBlocked) {
        params.set('vagueness_blocked', 'true');
      }
      router.push(`/ideas/${ideaId}/clarify?${params.toString()}`);
    }
  }, [pipeline.phase, pipeline.clarificationQuestions, pipeline.versionId, pipeline.vaguenessBlocked, ideaId, runId, router]);

  useEffect(() => {
    if (pipeline.phase === 'completed') {
      router.push(`/ideas/${ideaId}/report/${runId}`);
    }
  }, [pipeline.phase, ideaId, runId, router]);

  return (
    <div className="mx-auto max-w-xl space-y-6" aria-live="polite">
      <div>
        <h1 className="text-2xl font-bold text-white">Analyzing your idea...</h1>
        <p className="text-zinc-400 mt-1">This usually takes 30-60 seconds. Do not close this page.</p>
      </div>

      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 md:p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">Pipeline Progress</h3>
        <div className="space-y-3">
          {pipeline.steps.map((step) => (
            <div key={step.step} className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center">
                {step.status === 'completed' && <Check className="h-5 w-5 text-[#6ec88e]" />}
                {step.status === 'active' && <Loader2 className="h-5 w-5 text-[#9b8ce8] animate-spin" />}
                {step.status === 'failed' && <X className="h-5 w-5 text-[#d47070]" />}
                {step.status === 'pending' && <Circle className="h-5 w-5 text-zinc-600" />}
              </div>
              <div className="flex-1">
                <p className={`text-sm ${step.status === 'active' ? 'font-medium text-white' : step.status === 'completed' ? 'text-zinc-300' : step.status === 'failed' ? 'text-[#d47070]' : 'text-zinc-500'}`}>
                  {step.name}
                </p>
                {step.error && <p className="text-xs text-[#d47070] mt-0.5">{step.error}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {pipeline.phase === 'failed' && (
        <Alert variant="destructive">
          <AlertDescription>
            {pipeline.error ?? 'Analysis failed.'}
            <Button variant="outline" size="sm" className="ml-3 border-white/[0.12] text-zinc-300 hover:bg-white/[0.06]" onClick={() => {
              pipeline.retryFromFailedStep(runId);
            }}>
              Retry from failed step
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense>
      <ProgressContent />
    </Suspense>
  );
}
