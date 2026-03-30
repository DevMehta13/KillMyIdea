'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { VERDICT_COLORS, VERDICT_LABELS } from '@/lib/constants';
import { ChevronDown } from 'lucide-react';
import type { Verdict } from '@/types/database';

interface VerdictBannerProps {
  verdict: string;
  score: number;
  confidence: number;
  oneLiner: string;
  executiveSummary?: string;
  weaknesses?: string;
  strengthenings?: string;
}

export function VerdictBanner({
  verdict,
  score,
  confidence,
  oneLiner,
  executiveSummary,
  weaknesses,
  strengthenings,
}: VerdictBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const typedVerdict = verdict as Verdict;
  const color = VERDICT_COLORS[typedVerdict] ?? VERDICT_COLORS.insufficient_data;
  const label = VERDICT_LABELS[typedVerdict] ?? verdict;

  // Score ring: SVG circle progress
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;

  return (
    <div className="overflow-hidden rounded-2xl" style={{ backgroundColor: color }}>
      {/* Main banner */}
      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          {/* Score ring */}
          <div className="relative flex shrink-0 items-center justify-center">
            <svg width="100" height="100" viewBox="0 0 100 100" className="sm:h-[110px] sm:w-[110px]">
              {/* Background ring */}
              <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
              {/* Progress ring */}
              <circle
                cx="50" cy="50" r={radius} fill="none"
                stroke="white" strokeWidth="6" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference - progress}
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-3xl font-bold leading-none text-white sm:text-4xl">
                {score.toFixed(1)}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/70">
                / 10
              </span>
            </div>
          </div>

          {/* Verdict + Summary */}
          <div className="flex flex-1 flex-col gap-2 text-center sm:text-left">
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {label}
              </h1>
              <span className="rounded-full bg-white/20 px-3 py-1 font-mono text-sm font-medium text-white backdrop-blur-sm">
                {Math.round(confidence * 100)}% confident
              </span>
            </div>
            <p className="text-base leading-relaxed text-white/90 sm:text-lg">
              {oneLiner}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable executive summary + insights */}
      {(executiveSummary || weaknesses || strengthenings) && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-white/15 px-6 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {expanded ? 'Hide details' : 'View executive summary'}
            <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
          </button>

          {expanded && (
            <div className="border-t border-white/10 px-6 pb-8 pt-5 sm:px-10">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {executiveSummary && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Summary</h4>
                    <p className="text-sm leading-relaxed text-white/85">{executiveSummary}</p>
                  </div>
                )}
                {weaknesses && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">Key Weaknesses</h4>
                    <p className="text-sm leading-relaxed text-white/85">{weaknesses}</p>
                  </div>
                )}
                {strengthenings && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">How to Strengthen</h4>
                    <p className="text-sm leading-relaxed text-white/85">{strengthenings}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
