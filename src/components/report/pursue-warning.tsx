import { AlertTriangle } from 'lucide-react';

interface PursueWarningProps {
  verdict: string;
}

export function PursueWarning({ verdict }: PursueWarningProps) {
  if (verdict !== 'pursue') {
    return null;
  }

  return (
    <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#d4a06b]/20 bg-[#d4a06b]/[0.06] px-4 py-3">
      <AlertTriangle className="size-4 text-[#d4a06b] mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-[#d4a06b]">Important Caveat</p>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
          A &ldquo;Pursue&rdquo; verdict does not guarantee success. It means the
          evidence leans positive &mdash; but major unknowns may remain. Review the
          assumptions and red flags below carefully.
        </p>
      </div>
    </div>
  );
}
