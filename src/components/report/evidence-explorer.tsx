'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, ChevronDown, Search, Globe, MessageSquare, TrendingUp, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EvidenceBadge } from './evidence-badge';

interface EvidenceSignal {
  id: string;
  source_type: string;
  signal_category: string | null;
  normalized_summary: string | null;
  source_url: string | null;
  raw_data: Record<string, unknown>;
}

interface EvidenceExplorerProps {
  signals: EvidenceSignal[];
}

const SOURCE_CONFIG: Record<string, { label: string; icon: typeof Globe; color: string }> = {
  serper: { label: 'Web Search', icon: Search, color: 'text-[#7ea3d4]' },
  hackernews: { label: 'HackerNews', icon: MessageSquare, color: 'text-orange-600' },
  google_trends: { label: 'Google Trends', icon: TrendingUp, color: 'text-[#6ec88e]' },
  llm_knowledge: { label: 'LLM Analysis', icon: Brain, color: 'text-[#9b8ce8]' },
};

const TAB_ORDER = ['serper', 'hackernews', 'google_trends', 'llm_knowledge'];

function isVerified(signal: EvidenceSignal): boolean {
  return !!signal.source_url && signal.source_type !== 'llm_knowledge';
}

function SignalRow({ signal }: { signal: EvidenceSignal }) {
  const [expanded, setExpanded] = useState(false);
  const data = signal.raw_data as Record<string, unknown>;
  const config = SOURCE_CONFIG[signal.source_type] ?? SOURCE_CONFIG.serper;
  const Icon = config.icon;

  // Extract key metrics for the compact row
  const metrics: string[] = [];
  if (data.points !== undefined) metrics.push(`${data.points} pts`);
  if (data.num_comments !== undefined) metrics.push(`${data.num_comments} comments`);
  if (data.position !== undefined) metrics.push(`#${data.position}`);
  if (data.direction !== undefined) metrics.push(String(data.direction));
  if (data.growth_pct !== undefined) metrics.push(`${Number(data.growth_pct) > 0 ? '+' : ''}${data.growth_pct}%`);

  const summary = signal.normalized_summary ?? 'No summary available';
  // Truncate for the collapsed view
  const shortSummary = summary.length > 120 ? summary.slice(0, 120) + '...' : summary;
  const needsExpand = summary.length > 120;

  return (
    <div className="group border-b border-white/[0.08] last:border-b-0">
      <div
        className={cn(
          'flex items-start gap-3 px-3 py-2.5 transition-colors',
          needsExpand && 'cursor-pointer hover:bg-white/[0.04]',
        )}
        onClick={() => needsExpand && setExpanded(!expanded)}
      >
        {/* Source icon */}
        <Icon className={cn('mt-0.5 size-3.5 shrink-0', config.color)} />

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-zinc-300">
            {expanded ? summary : shortSummary}
          </p>

          {/* Compact meta row */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {signal.signal_category && (
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                {signal.signal_category}
              </span>
            )}
            {metrics.length > 0 && (
              <>
                <span className="text-white/[0.08]">·</span>
                {metrics.map((m, i) => (
                  <span key={i} className="font-mono text-[10px] text-zinc-400">{m}</span>
                ))}
              </>
            )}
            <EvidenceBadge verified={isVerified(signal)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {signal.source_url && (
            <a
              href={signal.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1 text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
              onClick={(e) => e.stopPropagation()}
              title="Open source"
            >
              <ExternalLink className="size-3" />
            </a>
          )}
          {needsExpand && (
            <ChevronDown className={cn(
              'size-3 text-zinc-300 transition-transform',
              expanded && 'rotate-180',
            )} />
          )}
        </div>
      </div>
    </div>
  );
}

export function EvidenceExplorer({ signals }: EvidenceExplorerProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const groupedSignals = useMemo(() => {
    if (!signals || signals.length === 0) return new Map<string, EvidenceSignal[]>();
    const groups = new Map<string, EvidenceSignal[]>();
    for (const signal of signals) {
      const existing = groups.get(signal.source_type) ?? [];
      existing.push(signal);
      groups.set(signal.source_type, existing);
    }
    return groups;
  }, [signals]);

  if (groupedSignals.size === 0) {
    return (
      <p className="rounded-lg border border-dashed border-white/[0.08] px-4 py-6 text-center text-sm text-zinc-400">
        No evidence signals available for this analysis.
      </p>
    );
  }

  const tabKeys = Array.from(groupedSignals.keys()).sort(
    (a, b) => (TAB_ORDER.indexOf(a) === -1 ? 99 : TAB_ORDER.indexOf(a)) -
              (TAB_ORDER.indexOf(b) === -1 ? 99 : TAB_ORDER.indexOf(b))
  );

  // Default to first tab
  const currentTab = activeTab ?? tabKeys[0];
  const currentSignals = groupedSignals.get(currentTab) ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-white/[0.08] bg-white/[0.02]">
        {tabKeys.map((key) => {
          const config = SOURCE_CONFIG[key] ?? SOURCE_CONFIG.serper;
          const Icon = config.icon;
          const count = groupedSignals.get(key)?.length ?? 0;
          const isActive = key === currentTab;

          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-[12px] font-medium transition-colors',
                isActive
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300'
              )}
            >
              <Icon className="size-3.5" />
              {config.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 font-mono text-[10px]',
                isActive ? 'bg-white text-[#1a1a1c]' : 'bg-white/[0.06] text-zinc-500'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Signal list — capped height with scroll */}
      <div className="max-h-[360px] overflow-y-auto">
        {currentSignals.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </div>

      {/* Footer with count */}
      <div className="border-t border-white/[0.08] bg-white/[0.02] px-3 py-1.5">
        <span className="text-[11px] text-zinc-400">
          {signals.length} signals across {tabKeys.length} sources
        </span>
      </div>
    </div>
  );
}
