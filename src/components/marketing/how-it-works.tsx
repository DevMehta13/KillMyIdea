import { MessageSquare, Search, FileCheck } from 'lucide-react';

const STEPS = [
  {
    icon: MessageSquare,
    title: 'Paste your idea',
    description: 'Describe your startup idea in plain language. No pitch deck needed.',
  },
  {
    icon: Search,
    title: 'We analyze it',
    description: 'AI collects market signals, scores 7 dimensions, and applies guardrail logic.',
  },
  {
    icon: FileCheck,
    title: 'Get a verdict',
    description: 'Pursue, Refine, Test First, or Drop — with evidence, reasoning, and next steps.',
  },
];

export function HowItWorks() {
  return (
    <section className="border-t bg-muted/30 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
