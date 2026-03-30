/**
 * Paywall overlay — blurred overlay for gated report sections (DEC-023).
 * Shows lock icon and CTA to get full report.
 * Used on Quick Roast upsell flow.
 */

'use client';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PaywallOverlayProps {
  ctaText?: string;
  ctaHref?: string;
  children: React.ReactNode;
}

export function PaywallOverlay({
  ctaText = 'Get Full Report',
  ctaHref = '/signup',
  children,
}: PaywallOverlayProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border">
      {/* Blurred content underneath */}
      <div className="pointer-events-none select-none blur-sm opacity-50">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Lock className="h-6 w-6 text-gray-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Full Analysis Available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Get detailed scoring, evidence, and actionable next steps.
            </p>
          </div>
          <Link href={ctaHref}>
            <Button style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white">
              {ctaText}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
