'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SCORING_DIMENSIONS, VERDICT_COLORS, VERDICT_LABELS } from '@/lib/constants';
import type { Verdict, SignalCategory } from '@/types/database';

interface CompareItem {
  idea_id: string;
  title: string;
  verdict: string;
  overall_score: number;
  scores: Record<string, number>;
}

interface ComparisonTableProps {
  comparison: CompareItem[];
}

const DIMENSION_LABELS: Record<SignalCategory, string> = {
  demand: 'Demand',
  urgency: 'Urgency',
  distribution: 'Distribution',
  differentiation: 'Differentiation',
  competition: 'Competition',
  monetization: 'Monetization',
  execution: 'Execution',
};

function scoreColor(score: number): string {
  if (score >= 7) return 'text-[#6ec88e]';
  if (score >= 5) return 'text-[#d4a06b]';
  return 'text-[#d47070]';
}

export function ComparisonTable({ comparison }: ComparisonTableProps) {
  if (comparison.length === 0) return null;

  return (
    <Card className="rounded-2xl border-white/[0.08] shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm text-white">Score Comparison</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left py-2 pr-4 font-medium text-zinc-400">Dimension</th>
              {comparison.map((c) => (
                <th key={c.idea_id} className="text-center py-2 px-2 font-medium max-w-[120px] truncate text-zinc-200">
                  {c.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Verdict row */}
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <td className="py-2 pr-4 font-medium text-zinc-300">Verdict</td>
              {comparison.map((c) => (
                <td key={c.idea_id} className="text-center py-2 px-2">
                  <Badge
                    style={{
                      backgroundColor: VERDICT_COLORS[c.verdict as Verdict] ?? '#6B7280',
                      color: 'white',
                    }}
                  >
                    {VERDICT_LABELS[c.verdict as Verdict] ?? c.verdict}
                  </Badge>
                </td>
              ))}
            </tr>
            {/* Overall score row */}
            <tr className="border-b border-white/[0.08] bg-white/[0.02]">
              <td className="py-2 pr-4 font-medium text-zinc-300">Overall</td>
              {comparison.map((c) => (
                <td key={c.idea_id} className={`text-center py-2 px-2 font-mono font-bold ${scoreColor(c.overall_score)}`}>
                  {c.overall_score.toFixed(1)}
                </td>
              ))}
            </tr>
            {/* Dimension rows */}
            {SCORING_DIMENSIONS.map((dim) => (
              <tr key={dim} className="border-b border-white/[0.06]">
                <td className="py-2 pr-4 text-zinc-400">{DIMENSION_LABELS[dim]}</td>
                {comparison.map((c) => {
                  const score = c.scores[dim] ?? 0;
                  return (
                    <td key={c.idea_id} className={`text-center py-2 px-2 font-mono ${scoreColor(score)}`}>
                      {score.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
