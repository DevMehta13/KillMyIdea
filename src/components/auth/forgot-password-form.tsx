'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      setError(resetError.message);
    } else {
      setSuccess(true);
    }
    setIsLoading(false);
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="text-sm text-zinc-400">
          If an account exists for {email}, you&apos;ll receive a password reset link.
        </p>
        <Link href="/signin">
          <Button variant="outline" className="border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:text-white">Back to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Reset password</h1>
        <p className="mt-1 text-sm text-zinc-400">Enter your email to receive a reset link</p>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required disabled={isLoading} className="rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-500" />
        </div>
        <Button type="submit" className="w-full rounded-xl bg-[#7c6ce7] text-white hover:bg-[#6b5dd6]" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-zinc-400">
        <Link href="/signin" className="text-[#9b8ce8] hover:text-[#b8a5f0] underline">Back to sign in</Link>
      </p>
    </div>
  );
}
