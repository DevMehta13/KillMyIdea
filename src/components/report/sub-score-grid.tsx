import { cn } from '@/lib/utils';
import { SCORING_DIMENSIONS } from '@/lib/constants';
import type { SignalCategory } from '@/types/database';
import {
  TrendingUp, Clock, Share2, Fingerprint, Swords,
  DollarSign, Wrench, ShieldCheck,
} from 'lucide-react';

interface DimensionScoreData {
  score: number;
  weight: number;
  confidence: number;
  reasoning: string;
}

interface SubScoreGridProps {
  scores: Record<string, DimensionScoreData>;
}

const DIMENSION_META: Record<SignalCategory, { label: string; hint: string; icon: typeof TrendingUp }> = {
  demand: { label: 'Demand', hint: 'Do people want this?', icon: TrendingUp },
  urgency: { label: 'Urgency', hint: 'How badly do they need it?', icon: Clock },
  distribution: { label: 'Distribution', hint: 'Can you reach them?', icon: Share2 },
  differentiation: { label: 'Differentiation', hint: 'Is it different enough?', icon: Fingerprint },
  competition: { label: 'Competition', hint: 'How tough is the market?', icon: Swords },
  monetization: { label: 'Monetization', hint: 'Will they pay for it?', icon: DollarSign },
  execution: { label: 'Execution', hint: 'Can you actually build it?', icon: Wrench },
};

function scoreColor(score: number): string {
  if (score >= 7) return '#22C55E';
  if (score >= 5) return '#F59E0B';
  return '#EF4444';
}

function confidenceLabel(conf: number): string {
  if (conf >= 0.7) return 'High';
  if (conf >= 0.4) return 'Medium';
  return 'Low';
}

function ScoreCard({ dimension, data }: { dimension: SignalCategory; data: DimensionScoreData }) {
  const meta = DIMENSION_META[dimension];
  const Icon = meta.icon;
  const color = scoreColor(data.score);

  // Mini radial progress
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (data.score / 10) * circ;

  return (
    <div className="group relative flex flex-col items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 transition-shadow hover:shadow-md hover:shadow-[#9b8ce8]/5">
      {/* Score ring */}
      <div className="relative">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="28" cy="28" r={r} fill="none"
            stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 28 28)"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold leading-none text-white">
          {data.score.toFixed(1)}
        </span>
      </div>

      {/* Label + hint */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {meta.label}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500">{meta.hint}</span>
      </div>

      {/* Weight + Confidence */}
      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
        <span>{Math.round(data.weight * 100)}% weight</span>
        <span className="text-zinc-600">|</span>
        <span className={cn(
          data.confidence >= 0.7 ? 'text-[#6ec88e]' :
          data.confidence >= 0.4 ? 'text-[#d4a06b]' : 'text-[#d47070]'
        )}>
          {confidenceLabel(data.confidence)} conf.
        </span>
      </div>

      {/* Reasoning tooltip on hover */}
      <div className="pointer-events-none absolute -bottom-1 left-1/2 z-10 w-64 -translate-x-1/2 translate-y-full rounded-lg border border-white/[0.08] bg-[#2a2a2c] p-3 text-xs leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        {data.reasoning}
      </div>
    </div>
  );
}

export function SubScoreGrid({ scores }: SubScoreGridProps) {
  if (!scores || Object.keys(scores).length === 0) return null;

  const dimensionEntries = SCORING_DIMENSIONS.filter((d) => scores[d] != null);
  const avgConfidence = dimensionEntries.length > 0
    ? dimensionEntries.reduce((sum, d) => sum + (scores[d]?.confidence ?? 0), 0) / dimensionEntries.length
    : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {SCORING_DIMENSIONS.map((dim) => {
        const data = scores[dim];
        if (!data) return null;
        return <ScoreCard key={dim} dimension={dim} data={data} />;
      })}

      {/* Overall confidence card */}
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] p-4">
        <ShieldCheck className="size-5 text-zinc-500" />
        <span className="font-mono text-2xl font-bold text-[#9b8ce8]">
          {Math.round(avgConfidence * 100)}%
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Avg. Confidence
        </span>
      </div>
    </div>
  );
}
