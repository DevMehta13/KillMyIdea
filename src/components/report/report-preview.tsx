/**
 * Report preview — blurred skeleton of full report sections (DEC-023).
 * Shows what a full analysis contains, driving Quick Roast → Full Analysis conversion.
 */

'use client';

import { PaywallOverlay } from './paywall-overlay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ReportPreviewProps {
  ctaHref?: string;
  ctaText?: string;
}

function SkeletonReportContent() {
  return (
    <div className="space-y-6 p-4">
      {/* Verdict banner skeleton */}
      <div className="rounded-lg bg-gray-50 p-6 space-y-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-20" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Score grid skeleton */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Dimension Scores</h4>
        <div className="grid grid-cols-2 gap-3">
          {['Demand', 'Urgency', 'Distribution', 'Differentiation', 'Competition', 'Monetization', 'Execution'].map((dim) => (
            <Card key={dim} size="sm">
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground">{dim}</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-2 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Analysis reasoning skeleton */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Detailed Analysis</h4>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Flags skeleton */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-red-600">Red Flags</h4>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-green-600">Green Flags</h4>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>

      {/* Next steps skeleton */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Next Steps</h4>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export function ReportPreview({
  ctaHref = '/signup',
  ctaText = 'Get Full Report',
}: ReportPreviewProps) {
  return (
    <div className="mt-6">
      <p className="text-sm font-medium text-muted-foreground mb-2">
        Your full report would include:
      </p>
      <PaywallOverlay ctaHref={ctaHref} ctaText={ctaText}>
        <SkeletonReportContent />
      </PaywallOverlay>
    </div>
  );
}
