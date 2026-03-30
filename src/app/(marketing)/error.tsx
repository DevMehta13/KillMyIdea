/**
 * Marketing route group error boundary (DEC-028).
 * Contextual error page for public-facing marketing pages.
 */

'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">Page Error</h1>
      <p className="text-muted-foreground text-center max-w-md">
        We couldn&apos;t load this page. Please try again or return to the home page.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
