'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface IdeaOption {
  id: string;
  title: string;
  status: string;
}

interface IdeaSelectorProps {
  ideas: IdeaOption[];
  selected: string[];
  onToggle: (id: string) => void;
  isLoading: boolean;
}

export function IdeaSelector({ ideas, selected, onToggle }: IdeaSelectorProps) {
  const completedIdeas = ideas.filter((i) => i.status === 'completed');

  if (completedIdeas.length < 2) {
    return (
      <Card className="rounded-2xl border-white/[0.08] shadow-sm">
        <CardContent className="py-8 text-center text-zinc-500">
          You need at least 2 analyzed ideas to compare. You currently have {completedIdeas.length}.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {selected.map((id) => {
          const idea = ideas.find((i) => i.id === id);
          return (
            <Badge key={id} variant="secondary" className="gap-1 pr-1 rounded-xl">
              {idea?.title ?? id}
              <button onClick={() => onToggle(id)} className="ml-1 hover:bg-white/[0.04] rounded-full p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
        {selected.length > 0 && (
          <span className="text-xs text-zinc-500">{selected.length}/4 selected</span>
        )}
      </div>

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {completedIdeas.map((idea) => {
          const isSelected = selected.includes(idea.id);
          const isDisabled = !isSelected && selected.length >= 4;
          return (
            <div
              key={idea.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-white/[0.08] px-3 py-2 cursor-pointer transition-colors',
                isSelected ? 'border-blue-600 bg-[#7ea3d4]/10' : 'hover:bg-white/[0.04]',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !isDisabled && onToggle(idea.id)}
            >
              <Checkbox checked={isSelected} disabled={isDisabled} />
              <span className="text-sm truncate flex-1 text-zinc-200">{idea.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
