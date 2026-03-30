'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, SkipForward, Send } from 'lucide-react';
import { toast } from 'sonner';
import { VaguenessBlocker } from '@/components/analysis/vagueness-blocker';

interface Question {
  id: string;
  question: string;
  dimension: string;
  why_asked: string;
}

export default function ClarifyPage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const versionId = searchParams.get('version_id') ?? '';
  const runId = searchParams.get('run_id') ?? '';
  const isVaguenessBlocked = searchParams.get('vagueness_blocked') === 'true';

  const [questions] = useState<Question[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem(`clarify_${runId}`);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function updateAnswer(qId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  async function handleSubmit(skip: boolean) {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/ideas/${ideaId}/clarify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_id: versionId,
          answers: skip ? [] : questions.map((q) => ({ question_id: q.id, answer: answers[q.id] ?? '' })),
          skip,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit');
      }

      toast.success(skip ? 'Skipped — proceeding with assumptions' : 'Answers submitted');
      router.push(`/ideas/${ideaId}/report/${runId}/progress?resumed=true`);
    } catch (e) {
      setError((e as Error).message);
      setIsLoading(false);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-white">Clarification Questions</h1>
        <Alert><AlertDescription>No questions found. The analysis may have already proceeded.</AlertDescription></Alert>
        <Button onClick={() => router.push(`/ideas/${ideaId}/report/${runId}/progress`)} className="bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] text-white border-0">Go to progress</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Help us understand your idea better</h1>
        <p className="mt-1 text-zinc-400">
          {isVaguenessBlocked
            ? 'Your idea needs more clarity before we can analyze it properly.'
            : 'Answer these questions to get a more accurate analysis. You can also skip them.'}
        </p>
      </div>

      {isVaguenessBlocked && <VaguenessBlocker />}

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
            <div className="flex items-start gap-2 mb-2">
              <p className="text-sm font-medium text-zinc-200 flex-1">{q.question}</p>
              <span className="text-[10px] font-medium text-[#9b8ce8] bg-[#9b8ce8]/10 border border-[#9b8ce8]/20 rounded-full px-2 py-0.5 shrink-0">{q.dimension}</span>
            </div>
            <p className="text-xs text-zinc-500 mb-3">{q.why_asked}</p>
            <Textarea
              value={answers[q.id] ?? ''}
              onChange={(e) => updateAnswer(q.id, e.target.value)}
              placeholder="Your answer..."
              rows={2}
              disabled={isLoading}
              className="bg-white/[0.04] border-white/[0.12] rounded-xl"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        {!isVaguenessBlocked && (
          <Button variant="ghost" onClick={() => handleSubmit(true)} disabled={isLoading} className="text-zinc-400 hover:text-white hover:bg-white/[0.06]">
            <SkipForward className="mr-2 h-4 w-4" />
            Skip (use assumptions)
          </Button>
        )}
        {isVaguenessBlocked && <div />}
        <Button onClick={() => handleSubmit(false)} disabled={isLoading} className="bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] hover:from-[#8b7cf0] hover:to-[#a99af0] text-white border-0 shadow-lg shadow-[#9b8ce8]/15">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit answers
        </Button>
      </div>
    </div>
  );
}
