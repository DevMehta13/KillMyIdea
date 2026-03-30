'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { INPUT_LIMITS } from '@/lib/constants';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { ReportPreview } from '@/components/report/report-preview';
import { trackEvent } from '@/lib/analytics';

interface RoastResult {
  first_impression: string;
  biggest_flaw: string;
  what_to_clarify: string;
}

export function QuickRoastForm() {
  const [idea, setIdea] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [error, setError] = useState('');

  const charCount = idea.length;
  const isValid = charCount >= INPUT_LIMITS.quickRoastIdea.min && charCount <= INPUT_LIMITS.quickRoastIdea.max;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/quick-roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(`Rate limit reached. Try again in ${data.retryAfter ?? 60} seconds.`);
        } else {
          setError(data.message || 'Something went wrong. Please try again.');
        }
        return;
      }

      setResult(data.roast);
      trackEvent({ name: 'quick_roast_used' });
    } catch {
      setError('Network error. Please check your connection and try again.');
      toast.error('Failed to roast your idea');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            placeholder="Describe your startup idea in a few sentences..."
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            disabled={isLoading}
            className="w-full resize-none rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#9b8ce8]/50 focus:outline-none focus:ring-1 focus:ring-[#9b8ce8]/30 disabled:opacity-50 pr-16"
          />
          <span className="absolute bottom-3 right-3 text-xs text-zinc-600">
            {charCount}/{INPUT_LIMITS.quickRoastIdea.max}
          </span>
        </div>

        {error && (
          <div className="rounded-lg border border-[#d47070]/20 bg-[#d47070]/10 px-4 py-2.5 text-sm text-[#d47070]">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={!isValid || isLoading}
          className="w-full rounded-xl h-11 text-sm font-medium bg-white text-[#1a1a1c] hover:bg-zinc-100 border-0 shadow-lg shadow-white/10 transition-all duration-300 disabled:opacity-40"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Roasting...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Roast My Idea
            </>
          )}
        </Button>
      </form>

      {result && (
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden">
          <div className="divide-y divide-white/[0.06]">
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#d4a06b] mb-1">First Impression</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.first_impression}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#d47070] mb-1">Biggest Flaw</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.biggest_flaw}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7ea3d4] mb-1">What to Clarify</p>
              <p className="text-sm text-zinc-300 leading-relaxed">{result.what_to_clarify}</p>
            </div>
          </div>
        </div>
      )}

      {result && (
        <ReportPreview
          ctaHref="/signup"
          ctaText="Sign Up for Full Report"
        />
      )}
    </div>
  );
}
