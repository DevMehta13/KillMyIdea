'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { IdeaSelector } from '@/components/compare/idea-selector';
import { ComparisonTable } from '@/components/compare/comparison-table';
import { ComparisonTakeaway } from '@/components/compare/comparison-takeaway';
import { Loader2, GitCompareArrows } from 'lucide-react';

interface IdeaOption {
  id: string;
  title: string;
  status: string;
}

interface CompareItem {
  idea_id: string;
  title: string;
  verdict: string;
  overall_score: number;
  scores: Record<string, number>;
}

export default function ComparePage() {
  const [ideas, setIdeas] = useState<IdeaOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparison, setComparison] = useState<CompareItem[]>([]);
  const [takeaway, setTakeaway] = useState('');
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ideas')
      .then((res) => res.json())
      .then((data) => {
        setIdeas(data.ideas ?? []);
        setIsLoadingIdeas(false);
      })
      .catch(() => setIsLoadingIdeas(false));
  }, []);

  function toggleIdea(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    // Reset results when selection changes
    setComparison([]);
    setTakeaway('');
    setError('');
  }

  async function handleCompare() {
    if (selected.length < 2) return;
    setIsComparing(true);
    setError('');

    try {
      const res = await fetch('/api/ideas/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea_ids: selected }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Comparison failed');
      }

      const data = await res.json();
      setComparison(data.comparison);
      setTakeaway(data.takeaway);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsComparing(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Compare Ideas</h1>
        <Button
          onClick={handleCompare}
          disabled={selected.length < 2 || isComparing}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isComparing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Comparing...</>
          ) : (
            <><GitCompareArrows className="mr-2 h-4 w-4" /> Compare ({selected.length})</>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoadingIdeas ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 bg-white/[0.06]" />)}</div>
      ) : (
        <IdeaSelector
          ideas={ideas}
          selected={selected}
          onToggle={toggleIdea}
          isLoading={isComparing}
        />
      )}

      {comparison.length > 0 && (
        <>
          <ComparisonTable comparison={comparison} />
          <ComparisonTakeaway takeaway={takeaway} />
        </>
      )}
    </div>
  );
}
