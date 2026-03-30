'use client';

import { cn } from '@/lib/utils';
import { VERDICT_COLORS, VERDICT_LABELS } from '@/lib/constants';
import type { Verdict } from '@/types/database';

interface NavItem {
  id: string;
  label: string;
}

interface ReportNavProps {
  items: NavItem[];
  activeSection: string;
  verdict: string;
}

export function ReportNav({ items, activeSection, verdict }: ReportNavProps) {
  const verdictColor = VERDICT_COLORS[verdict as Verdict] ?? VERDICT_COLORS.insufficient_data;
  const verdictLabel = VERDICT_LABELS[verdict as Verdict] ?? verdict;

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      {/* ── Desktop sidebar (rendered inside a sticky parent) ── */}
      <nav className="hidden xl:flex flex-col gap-0.5 pt-2" aria-label="Report sections">
        <div className="mb-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: `${verdictColor}14` }}>
          <span className="size-2 rounded-full" style={{ backgroundColor: verdictColor }} />
          <span className="text-[11px] font-semibold" style={{ color: verdictColor }}>{verdictLabel}</span>
        </div>

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className={cn(
              'w-full rounded-md px-2.5 py-1.5 text-left text-[12px] transition-colors',
              activeSection === item.id
                ? 'bg-white/[0.06] font-semibold text-white'
                : 'text-zinc-400 hover:text-zinc-300'
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* ── Mobile/Tablet horizontal pills ── */}
      <div className="xl:hidden overflow-x-auto border-b border-white/[0.08] bg-[#1a1a1c]/95 px-5 py-2 backdrop-blur-sm sm:px-7">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ backgroundColor: verdictColor }}
          >
            {verdictLabel}
          </span>
          <span className="mx-0.5 h-4 w-px bg-white/[0.08]" />
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] transition-colors',
                activeSection === item.id
                  ? 'bg-white text-[#1a1a1c] font-medium'
                  : 'bg-white/[0.06] text-zinc-500 hover:bg-white/[0.08]'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
