/**
 * Vagueness blocker banner — shown on clarification page when
 * vagueness_score >= 0.7 (DEC-021).
 * Explains why clarification is mandatory and hides skip button.
 */

'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface VaguenessBlockerProps {
  vaguenessFlags?: string[];
}

export function VaguenessBlocker({ vaguenessFlags }: VaguenessBlockerProps) {
  return (
    <Alert className="border-amber-300 bg-[#d4a06b]/10">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertDescription className="ml-2">
        <p className="font-semibold text-[#d4a06b]">Your idea needs more detail</p>
        <p className="mt-1 text-sm text-[#d4a06b]">
          We can&apos;t give you a reliable analysis without clearer answers.
          Please answer the questions below — skipping is not available for vague ideas.
        </p>
        {vaguenessFlags && vaguenessFlags.length > 0 && (
          <ul className="mt-2 list-disc pl-4 text-sm text-[#d4a06b]">
            {vaguenessFlags.map((flag, i) => (
              <li key={i}>{flag}</li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  );
}
