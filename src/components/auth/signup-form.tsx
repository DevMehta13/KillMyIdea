'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const quickRoastId = searchParams.get('quickRoastId');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setIsLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  async function handleGoogleSignUp() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">Create an account</h1>
        <p className="mt-1 text-sm text-zinc-400">Start evaluating your ideas</p>
      </div>

      {quickRoastId && (
        <Alert className="rounded-xl border-white/[0.08] bg-white/[0.04] text-zinc-300">
          <AlertDescription>Sign up to save your roast and get a full analysis.</AlertDescription>
        </Alert>
      )}

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
        <div className="space-y-2">
          <Label htmlFor="password" className="text-zinc-300">Password</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} className="rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-500" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-zinc-300">Confirm password</Label>
          <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} className="rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-500" />
        </div>
        <Button type="submit" className="w-full rounded-xl bg-[#7c6ce7] text-white hover:bg-[#6b5dd6]" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign up
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/[0.08]" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#1a1a1c] px-2 text-zinc-500">or</span>
        </div>
      </div>

      <Button variant="outline" className="w-full rounded-xl border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] hover:text-white" onClick={handleGoogleSignUp}>
        Continue with Google
      </Button>

      <p className="text-center text-sm text-zinc-400">
        Already have an account?{' '}
        <Link href="/signin" className="text-[#9b8ce8] hover:text-[#b8a5f0] font-medium">Sign in</Link>
      </p>
    </div>
  );
}
