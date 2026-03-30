/**
 * Clarification answers section for the report page (DEC-026).
 * Shows the user's answers to clarification questions alongside
 * which dimension each answer relates to.
 */

'use client';

import type { ClarificationQA } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

interface ClarificationAnswersProps {
  answers: ClarificationQA[];
}

export function ClarificationAnswers({ answers }: ClarificationAnswersProps) {
  if (!answers || answers.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Your Answers
        </h3>
      </div>

      <div className="space-y-3">
        {answers.map((qa, i) => (
          <Card key={i} size="sm">
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-muted-foreground">{qa.question}</p>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {qa.dimension}
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground">{qa.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
