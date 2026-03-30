'use client';

import { Button } from '@/components/ui/button';
import { CREDIT_PACKAGES } from '@/lib/constants';
import { Loader2, Check, Crown } from 'lucide-react';

interface CreditPackagesProps {
  onPurchase: (packageId: string) => void;
  isLoading: boolean;
  loadingPackage: string | null;
}

const PLAN_DETAILS = [
  {
    name: 'Starter',
    subtitle: 'Perfect for trying it out',
    badge: null,
    highlighted: false,
    btnVariant: 'outline-default' as const,
    features: ['Full 7-dimension analysis', 'Real competitor data', 'Evidence-backed verdict', 'Red & green flags', 'Actionable next steps'],
    featureLabel: 'WHAT YOU GET',
  },
  {
    name: 'Pro',
    subtitle: 'Best value for founders',
    badge: 'Best Value',
    highlighted: true,
    btnVariant: 'filled' as const,
    features: ['Everything in Starter', 'Compare ideas side-by-side', 'AI comparison takeaway', 'Unlimited share links', 'Priority analysis'],
    featureLabel: 'EVERYTHING IN STARTER, PLUS',
  },
  {
    name: 'Team',
    subtitle: 'For serious idea pipelines',
    badge: null,
    highlighted: false,
    btnVariant: 'outline-violet' as const,
    features: ['Everything in Pro', 'Bulk analysis discount', 'Full evidence explorer', 'Admin dashboard', 'Priority support'],
    featureLabel: 'EVERYTHING IN PRO, PLUS',
  },
];

export function CreditPackages({ onPurchase, isLoading, loadingPackage }: CreditPackagesProps) {
  return (
    <div className="grid gap-5 md:grid-cols-3 items-start">
      {CREDIT_PACKAGES.map((pkg, i) => {
        const plan = PLAN_DETAILS[i];
        const hl = plan.highlighted;
        const loading = loadingPackage === pkg.id;

        return (
          <div
            key={pkg.id}
            className={`relative rounded-2xl p-6 transition-shadow ${
              hl
                ? 'bg-gradient-to-b from-[#9b8ce8]/10 to-white/[0.04] border-2 border-[#9b8ce8]/20 shadow-lg shadow-[#9b8ce8]/10'
                : 'bg-white/[0.04] border border-white/[0.08] shadow-sm hover:shadow-lg hover:shadow-[#9b8ce8]/5'
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 bg-[#7c6ce7] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                  <Crown className="h-3 w-3" /> {plan.badge}
                </span>
              </div>
            )}

            <div className={hl ? 'pt-2' : ''}>
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">{plan.subtitle}</p>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Starts at</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-bold text-white">₹{pkg.price_inr}</span>
                <span className="text-xs text-zinc-400">/ {pkg.credits} credits</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">₹{Math.round(pkg.price_inr / pkg.credits)} per analysis</p>
            </div>

            <div className="mt-5">
              <Button
                onClick={() => onPurchase(pkg.id)}
                disabled={isLoading}
                variant={hl ? 'default' : 'outline'}
                className={`w-full rounded-xl h-10 font-semibold ${
                  hl
                    ? 'bg-[#7c6ce7] hover:bg-violet-700 text-white'
                    : plan.btnVariant === 'outline-violet'
                    ? 'border-[#9b8ce8]/20 text-[#9b8ce8] hover:bg-[#9b8ce8]/10'
                    : 'border-white/[0.08] text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Subscribe
              </Button>
            </div>

            <div className="mt-6">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">{plan.featureLabel}</p>
              <div className="space-y-2.5">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${hl ? 'bg-[#9b8ce8]/20' : 'bg-white/[0.06]'}`}>
                      <Check className={`h-2.5 w-2.5 ${hl ? 'text-[#9b8ce8]' : 'text-zinc-500'}`} />
                    </div>
                    <span className="text-sm text-zinc-400">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
