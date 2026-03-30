'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ExternalLink } from 'lucide-react';

interface DimensionReasoningItem {
  dimension: string;
  score: number;
  reasoning: string;
  evidence_refs: string[];
}

interface ReasoningSectionProps {
  dimensionReasoning: DimensionReasoningItem[];
}

const DIMENSION_LABELS: Record<string, { label: string; question: string }> = {
  demand: { label: 'Demand', question: 'Do people actually want this?' },
  urgency: { label: 'Urgency', question: 'How badly do they need it right now?' },
  distribution: { label: 'Distribution', question: 'Can you realistically reach your target users?' },
  differentiation: { label: 'Differentiation', question: 'What makes this different from what already exists?' },
  competition: { label: 'Competition', question: 'How tough is the market to break into?' },
  monetization: { label: 'Monetization', question: 'Will people pay for this?' },
  execution: { label: 'Execution', question: 'How hard is this to build and sustain?' },
};

function scoreColor(score: number): string {
  if (score >= 7) return 'bg-green-500';
  if (score >= 5) return 'bg-amber-500';
  return 'bg-red-500';
}

function scoreBg(score: number): string {
  if (score >= 7) return 'bg-green-50 dark:bg-green-950/20';
  if (score >= 5) return 'bg-amber-50 dark:bg-amber-950/20';
  return 'bg-red-50 dark:bg-red-950/20';
}

function ReasoningItem({ item }: { item: DimensionReasoningItem }) {
  const [open, setOpen] = useState(false);
  const meta = DIMENSION_LABELS[item.dimension] ?? { label: item.dimension, question: '' };

  // Separate real URLs from text references
  const realUrls = item.evidence_refs.filter((r) => r.startsWith('http'));
  const textRefs = item.evidence_refs.filter((r) => !r.startsWith('http'));

  return (
    <div className={cn('rounded-xl border transition-colors', open && scoreBg(item.score))}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Score dot */}
        <span className={cn('size-2.5 shrink-0 rounded-full', scoreColor(item.score))} />

        {/* Label + question */}
        <div className="flex flex-1 flex-col">
          <span className="text-sm font-semibold text-foreground">{meta.label}</span>
          {meta.question && !open && (
            <span className="text-[11px] text-zinc-400">{meta.question}</span>
          )}
        </div>
        <span className="font-mono text-sm font-bold text-muted-foreground">
          {item.score.toFixed(1)}
        </span>

        <ChevronDown className={cn(
          'size-4 text-muted-foreground transition-transform',
          open && 'rotate-180'
        )} />
      </button>

      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {item.reasoning}
          </p>

          {(realUrls.length > 0 || textRefs.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {realUrls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  <ExternalLink className="size-2.5" />
                  Source
                </a>
              ))}
              {textRefs.map((ref) => (
                <Badge key={ref} variant="outline" className="text-[10px]">
                  {ref.length > 60 ? ref.slice(0, 60) + '...' : ref}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReasoningSection({ dimensionReasoning }: ReasoningSectionProps) {
  if (!dimensionReasoning || dimensionReasoning.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {dimensionReasoning.map((item) => (
        <ReasoningItem key={item.dimension} item={item} />
      ))}
    </div>
  );
}
