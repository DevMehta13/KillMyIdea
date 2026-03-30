import { cn } from '@/lib/utils';
import { ArrowRight, FlaskConical, PenLine, ShieldCheck, Hammer } from 'lucide-react';

interface NextStepItem {
  action: string;
  priority: number;
  type: string;
}

interface NextStepsPanelProps {
  nextSteps: NextStepItem[];
  verdict: string;
}

const HEADING_BY_VERDICT: Record<string, { title: string; subtitle: string }> = {
  pursue: { title: 'Recommended Next Steps', subtitle: 'Actions to take as you build' },
  refine: { title: 'How to Improve', subtitle: 'Fix these gaps before committing' },
  test_first: { title: 'What to Test', subtitle: 'Validate these assumptions with real experiments' },
  drop: { title: 'Salvage Options', subtitle: 'What you can still learn from this idea' },
  insufficient_data: { title: 'Gather More Data', subtitle: 'What to research before re-running the analysis' },
};

const TYPE_CONFIG: Record<string, { icon: typeof FlaskConical; color: string; bg: string }> = {
  test: { icon: FlaskConical, color: 'text-[#7ea3d4] dark:text-[#7ea3d4]', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  refine: { icon: PenLine, color: 'text-[#d4a06b] dark:text-[#d4a06b]', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  validate: { icon: ShieldCheck, color: 'text-[#9b8ce8] dark:text-[#9b8ce8]', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  build: { icon: Hammer, color: 'text-[#6ec88e] dark:text-[#6ec88e]', bg: 'bg-green-50 dark:bg-green-950/30' },
};

export function NextStepsPanel({ nextSteps, verdict }: NextStepsPanelProps) {
  if (!nextSteps || nextSteps.length === 0) return null;

  const heading = HEADING_BY_VERDICT[verdict] ?? { title: 'Next Steps', subtitle: 'Recommended actions' };
  const sorted = [...nextSteps].sort((a, b) => a.priority - b.priority);

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{heading.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{heading.subtitle}</p>
      </div>

      <ol className="flex flex-col gap-3">
        {sorted.map((step, idx) => {
          const config = TYPE_CONFIG[step.type] ?? TYPE_CONFIG.validate;
          const Icon = config.icon;

          return (
            <li
              key={idx}
              className="group flex items-start gap-4 rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              {/* Priority number */}
              <div className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg',
                config.bg
              )}>
                <span className={cn('font-mono text-sm font-bold', config.color)}>
                  {step.priority}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-1.5">
                <p className="text-sm leading-relaxed text-foreground">
                  {step.action}
                </p>
                <div className="flex items-center gap-1.5">
                  <Icon className={cn('size-3', config.color)} />
                  <span className={cn('text-[11px] font-medium uppercase tracking-wider', config.color)}>
                    {step.type}
                  </span>
                </div>
              </div>

              <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground" />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
