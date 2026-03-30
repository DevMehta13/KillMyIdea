/**
 * Evidence badge — shows verified/unverified status for evidence items (DEC-022).
 * Verified: real URL from Serper/HackerNews/Google Trends (green badge).
 * Unverified: LLM-generated analysis without URL backing (amber badge).
 */

'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';

interface EvidenceBadgeProps {
  verified: boolean;
}

export function EvidenceBadge({ verified }: EvidenceBadgeProps) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#6ec88e]/10 px-2 py-0.5 text-[10px] font-medium text-[#6ec88e]">
        <CheckCircle className="size-3" />
        Verified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#d4a06b]/10 px-2 py-0.5 text-[10px] font-medium text-[#d4a06b]">
      <AlertCircle className="size-3" />
      LLM Analysis
    </span>
  );
}
