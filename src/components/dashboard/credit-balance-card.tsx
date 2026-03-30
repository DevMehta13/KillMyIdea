'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/hooks';
import { Coins, ArrowRight } from 'lucide-react';

export function CreditBalanceCard() {
  const { profile, isLoading } = useAuth();

  return (
    <div className="rounded-2xl bg-white border border-black/5 p-5">
      <div className="flex items-center gap-2 text-zinc-500 mb-3">
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="text-sm font-medium">Credits</span>
      </div>
      {isLoading ? (
        <div className="h-9 w-16 bg-zinc-100 animate-pulse rounded-xl" />
      ) : (
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold tracking-tight">{profile?.credit_balance ?? 0}</p>
            <p className="text-xs text-zinc-400 mt-0.5">Analyses Remaining</p>
          </div>
          <Link href="/settings/billing">
            <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg gap-1">
              Buy more <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
