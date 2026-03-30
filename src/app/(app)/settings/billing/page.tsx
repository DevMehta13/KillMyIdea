'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CreditPackages } from '@/components/billing/credit-packages';
import { TransactionHistory } from '@/components/billing/transaction-history';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { ArrowRight, Gift } from 'lucide-react';

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState<'one-time' | 'bulk'>('one-time');
  const searchParams = useSearchParams();

  useEffect(() => {
    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');

    if (payment === 'success' && sessionId) {
      fetch('/api/credits/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.credits_added) {
            toast.success(`${data.credits_added} credits added! New balance: ${data.new_balance}`);
          } else if (data.error === 'already_processed') {
            toast.info('Payment already processed');
          } else {
            toast.error(data.message || 'Verification failed');
          }
        })
        .catch(() => toast.error('Failed to verify payment'));
      window.history.replaceState({}, '', '/settings/billing');
    } else if (payment === 'cancelled') {
      toast.info('Payment cancelled');
      window.history.replaceState({}, '', '/settings/billing');
    }
  }, [searchParams]);

  async function handlePurchase(packageId: string) {
    setIsLoading(true);
    setLoadingPackage(packageId);
    setError('');
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: packageId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create checkout session');
      }
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (e) {
      setError((e as Error).message);
      setIsLoading(false);
      setLoadingPackage(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ─── Promo Banner (like PlanBot) ─── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 md:p-8 text-white">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-20 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold bg-white/20 rounded-full px-3 py-0.5">SPECIAL OFFER</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold">Get Extra Credits Free With Pro Pack</h2>
            <p className="text-sm text-white/70 mt-1 max-w-md">Buy the 20-credit Pro pack and get the best value — only ₹15 per analysis. Save 25% compared to Starter.</p>
            <Button className="mt-4 bg-white text-violet-700 hover:bg-white/90 rounded-lg gap-2 font-semibold text-sm" onClick={() => handlePurchase('pack_20')}>
              Try Pro Pack <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="hidden md:flex items-center justify-center">
            <div className="h-28 w-28 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Gift className="h-14 w-14 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {error && <Alert variant="destructive" className="rounded-xl"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* ─── Upgrade Your Plan ─── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">Upgrade Your Plan</h2>
          <div className="flex items-center rounded-full overflow-hidden border border-white/[0.08] text-xs">
            <button
              onClick={() => setBillingCycle('one-time')}
              className={`px-4 py-1.5 transition-colors ${billingCycle === 'one-time' ? 'bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] text-white rounded-full' : 'text-zinc-400'}`}
            >
              One-time
            </button>
            <button
              onClick={() => setBillingCycle('bulk')}
              className={`px-4 py-1.5 transition-colors ${billingCycle === 'bulk' ? 'bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] text-white rounded-full' : 'text-zinc-400'}`}
            >
              Bulk Pricing
            </button>
          </div>
        </div>

        <CreditPackages onPurchase={handlePurchase} isLoading={isLoading} loadingPackage={loadingPackage} />
      </div>

      {/* ─── Transaction History ─── */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Transaction History</h2>
        <TransactionHistory />
      </div>
    </div>
  );
}
