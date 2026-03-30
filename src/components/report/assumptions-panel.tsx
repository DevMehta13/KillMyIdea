import { Badge } from '@/components/ui/badge';

interface AssumptionItem {
  text: string;
  type: 'user_stated' | 'inferred';
  source: string;
}

interface AssumptionsPanelProps {
  assumptions: AssumptionItem[];
}

export function AssumptionsPanel({ assumptions }: AssumptionsPanelProps) {
  if (!assumptions || assumptions.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        Assumptions
      </h3>

      <ul className="flex flex-col gap-3">
        {assumptions.map((item, idx) => (
          <li
            key={idx}
            className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-sm"
          >
            <div className="flex items-start gap-2">
              <Badge
                variant="secondary"
                className={
                  item.type === 'user_stated'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-[#7ea3d4]'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-[#d4a06b]'
                }
              >
                {item.type === 'user_stated' ? 'User stated' : 'Inferred'}
              </Badge>
            </div>

            <p className="leading-relaxed text-foreground">{item.text}</p>

            <span className="text-xs text-muted-foreground">
              Source: {item.source}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
