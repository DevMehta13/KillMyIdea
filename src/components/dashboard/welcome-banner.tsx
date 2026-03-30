/**
 * Welcome banner for first-time users (Tier 4 onboarding).
 * Shows when user has signup credits and no ideas yet.
 * Dismissible via localStorage.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap, X, Sparkles } from 'lucide-react';
import { FREE_SIGNUP_CREDITS } from '@/lib/constants';

interface WelcomeBannerProps {
  creditBalance: number;
  ideaCount: number;
}

const DISMISSED_KEY = 'kmi_welcome_dismissed';

export function WelcomeBanner({ creditBalance, ideaCount }: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  if (dismissed || ideaCount > 0 || creditBalance !== FREE_SIGNUP_CREDITS) {
    return null;
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }

  return (
    <div className="rounded-2xl border border-[#9b8ce8]/20 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#9b8ce8]/20">
            <Sparkles className="h-5 w-5 text-[#9b8ce8]" />
          </div>
          <div>
            <p className="font-semibold text-white">Welcome to Kill My Idea!</p>
            <p className="text-sm text-zinc-400">
              You have <strong className="text-[#9b8ce8]">{FREE_SIGNUP_CREDITS} free analyses</strong>. Paste your startup idea and get a brutally honest verdict.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/ideas/new">
            <Button size="sm" className="bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] hover:from-[#8b7cf0] hover:to-[#a99af0] text-white border-0 shadow-lg shadow-[#9b8ce8]/15">
              <Zap className="mr-1 h-3.5 w-3.5" />
              Analyze an Idea
            </Button>
          </Link>
          <button onClick={handleDismiss} className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors" aria-label="Dismiss welcome banner">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
