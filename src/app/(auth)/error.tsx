/**
 * Auth route group error boundary (DEC-028).
 * Contextual error page for authentication flows.
 */

'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">Authentication Error</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Something went wrong during authentication. Please try again or return to sign in.
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/signin">
          <Button variant="outline">Back to Sign In</Button>
        </Link>
      </div>
    </div>
  );
}
