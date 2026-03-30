import { AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RedFlagItem {
  text: string;
  severity: string;
  evidence_ref: string;
}

interface GreenFlagItem {
  text: string;
  strength: string;
  evidence_ref: string;
}

interface FlagsListProps {
  redFlags: RedFlagItem[];
  greenFlags: GreenFlagItem[];
}

function SeverityDot({ level }: { level: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-slate-400',
  };
  return <span className={cn('size-1.5 shrink-0 rounded-full', colors[level] ?? colors.medium)} />;
}

function EvidenceRef({ ref: evidenceRef }: { ref: string }) {
  if (!evidenceRef) return null;
  const isUrl = evidenceRef.startsWith('http');

  if (isUrl) {
    return (
      <a
        href={evidenceRef}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ExternalLink className="size-2.5" />
        Source
      </a>
    );
  }

  return (
    <span className="text-[11px] text-muted-foreground">
      {evidenceRef.length > 80 ? evidenceRef.slice(0, 80) + '...' : evidenceRef}
    </span>
  );
}

export function FlagsList({ redFlags, greenFlags }: FlagsListProps) {
  const hasRed = redFlags && redFlags.length > 0;
  const hasGreen = greenFlags && greenFlags.length > 0;

  if (!hasRed && !hasGreen) return null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Red Flags */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950/40">
            <AlertTriangle className="size-3.5 text-[#d47070] dark:text-[#d47070]" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Red Flags
            {hasRed && <span className="ml-1.5 font-mono text-xs text-muted-foreground">({redFlags.length})</span>}
          </h4>
        </div>

        {hasRed ? (
          <ul className="flex flex-col gap-2">
            {redFlags.map((flag, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-red-200/60 bg-red-50/30 px-3.5 py-3 dark:border-red-900/30 dark:bg-red-950/10"
              >
                <div className="flex items-start gap-2">
                  <SeverityDot level={flag.severity} />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <p className="text-sm leading-relaxed text-foreground">{flag.text}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#d47070]/70 dark:text-[#d47070]/70">
                        {flag.severity}
                      </span>
                      <EvidenceRef ref={flag.evidence_ref} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            No red flags identified
          </p>
        )}
      </div>

      {/* Green Flags */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950/40">
            <CheckCircle2 className="size-3.5 text-[#6ec88e] dark:text-[#6ec88e]" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Green Flags
            {hasGreen && <span className="ml-1.5 font-mono text-xs text-muted-foreground">({greenFlags.length})</span>}
          </h4>
        </div>

        {hasGreen ? (
          <ul className="flex flex-col gap-2">
            {greenFlags.map((flag, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-green-200/60 bg-green-50/30 px-3.5 py-3 dark:border-green-900/30 dark:bg-green-950/10"
              >
                <div className="flex items-start gap-2">
                  <span className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    flag.strength === 'strong' ? 'bg-green-500' : 'bg-emerald-400'
                  )} />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <p className="text-sm leading-relaxed text-foreground">{flag.text}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[#6ec88e]/70 dark:text-[#6ec88e]/70">
                        {flag.strength}
                      </span>
                      <EvidenceRef ref={flag.evidence_ref} />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            No green flags identified
          </p>
        )}
      </div>
    </div>
  );
}
