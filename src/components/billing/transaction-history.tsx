'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime, formatCredits } from '@/lib/utils/formatters';
import { ArrowUpRight, ArrowDownRight, Gift, RefreshCw, Settings2, Receipt } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  purchase: { icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-50', label: 'Purchase' },
  signup_bonus: { icon: Gift, color: 'text-[#7ea3d4]', bg: 'bg-[#7ea3d4]/10', label: 'Signup Bonus' },
  deduction: { icon: ArrowDownRight, color: 'text-red-500', bg: 'bg-red-50', label: 'Deduction' },
  refund: { icon: RefreshCw, color: 'text-amber-600', bg: 'bg-[#d4a06b]/10', label: 'Refund' },
  adjustment: { icon: Settings2, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Adjustment' },
};

export function TransactionHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/credits/transactions')
      .then((res) => res.json())
      .then((data) => {
        setTransactions(data.transactions ?? []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] py-12 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
          <Receipt className="h-5 w-5 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-400">No transactions yet</p>
        <p className="text-xs text-zinc-400 mt-1">Your credit purchases and usage will appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
      <div className="grid grid-cols-[1fr_120px_100px_80px] gap-4 px-5 py-3 border-b border-white/[0.08] text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
        <span>Activity</span>
        <span>Date</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Balance</span>
      </div>
      {transactions.map((tx, i) => {
        const config = TYPE_CONFIG[tx.type] ?? TYPE_CONFIG.adjustment;
        const Icon = config.icon;
        return (
          <div
            key={tx.id}
            className={`grid grid-cols-[1fr_120px_100px_80px] gap-4 px-5 py-3.5 items-center hover:bg-white/[0.04] transition-colors ${
              i !== transactions.length - 1 ? 'border-b border-white/5' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-300">{config.label}</p>
                {tx.description && <p className="text-[11px] text-zinc-400 truncate">{tx.description}</p>}
              </div>
            </div>
            <span className="text-xs text-zinc-400">{formatDateTime(tx.created_at)}</span>
            <span className={`text-sm font-semibold text-right font-mono ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCredits(tx.amount)}
            </span>
            <span className="text-xs text-zinc-400 text-right font-mono">{tx.balance_after}</span>
          </div>
        );
      })}
    </div>
  );
}
