import { QuickRoastForm } from './quick-roast-form';

export function HeroSection() {
  return (
    <section className="flex flex-col items-center px-4 py-16 sm:py-24 text-center">
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: 'var(--brand-primary)' }}>
        Your idea might be terrible.{' '}
        <span className="text-foreground">Let&apos;s find out.</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Get a brutally honest verdict on your startup idea — backed by real market signals, structured scoring, and actionable next steps.
      </p>
      <div className="mt-8 w-full flex justify-center">
        <QuickRoastForm />
      </div>
    </section>
  );
}
