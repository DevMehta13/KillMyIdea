'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Zap, ChevronRight } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/formatters';

interface IdeaItem {
  id: string;
  title: string;
  status: string;
  category: string | null;
  is_quick_roast: boolean;
  created_at: string;
  updated_at: string;
}

const STATUS_STYLES: Record<string, { dot: string; text: string; label: string }> = {
  draft: { dot: 'bg-zinc-500', text: 'text-zinc-500', label: 'Draft' },
  submitted: { dot: 'bg-[#7ea3d4]', text: 'text-[#7ea3d4]', label: 'Submitted' },
  analyzing: { dot: 'bg-[#d4a06b]', text: 'text-[#d4a06b]', label: 'Analyzing' },
  completed: { dot: 'bg-[#6ec88e]', text: 'text-[#6ec88e]', label: 'Completed' },
  failed: { dot: 'bg-[#d47070]', text: 'text-[#d47070]', label: 'Failed' },
};

export function IdeasList() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ideas')
      .then((res) => res.json())
      .then((data) => {
        setIdeas(data.ideas ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-1 p-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg bg-white/[0.06]" />
        ))}
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.08]">
          <Lightbulb className="h-6 w-6 text-zinc-500" />
        </div>
        <p className="font-semibold text-white">No Ideas Yet</p>
        <p className="text-sm text-zinc-500 mt-1">Submit your first idea and get a verdict.</p>
        <Link href="/ideas/new" className="mt-5 inline-block">
          <Button size="sm" className="rounded-lg bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] hover:from-[#8b7cf0] hover:to-[#a99af0] text-white gap-1.5 shadow-lg shadow-[#9b8ce8]/15">
            <Zap className="h-3.5 w-3.5" /> Analyze Your First Idea
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {ideas.map((idea, i) => {
        const style = STATUS_STYLES[idea.status] ?? STATUS_STYLES.draft;
        return (
          <Link key={idea.id} href={`/ideas/${idea.id}`}>
            <div className={`flex items-center justify-between px-4 py-3.5 hover:bg-white/[0.04] transition-colors cursor-pointer group ${i !== ideas.length - 1 ? 'border-b border-white/5' : ''}`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`h-2 w-2 rounded-full ${style.dot} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-[#9b8ce8] transition-colors">{idea.title}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{formatRelativeTime(idea.updated_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-[#9b8ce8] transition-colors" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
