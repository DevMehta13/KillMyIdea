import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface ComparisonTakeawayProps {
  takeaway: string;
}

export function ComparisonTakeaway({ takeaway }: ComparisonTakeawayProps) {
  if (!takeaway) return null;

  return (
    <Card className="rounded-2xl border-[#7ea3d4]/20 bg-[#7ea3d4]/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4 text-[#7ea3d4]" />
          AI Comparison Takeaway
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-zinc-300">{takeaway}</p>
      </CardContent>
    </Card>
  );
}
