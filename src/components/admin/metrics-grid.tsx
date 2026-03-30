'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Lightbulb, Activity, CheckCircle, XCircle, Radio } from 'lucide-react';
import { VERDICT_COLORS, VERDICT_LABELS } from '@/lib/constants';
import type { Verdict } from '@/types/database';

interface Metrics {
  totalUsers: number;
  totalIdeas: number;
  totalAnalyses: number;
  completed: number;
  failed: number;
  signalProviders: number;
  verdictDistribution: Record<string, number>;
}

const METRIC_CARDS = [
  { key: 'totalUsers', label: 'Total Users', icon: Users },
  { key: 'totalIdeas', label: 'Total Ideas', icon: Lightbulb },
  { key: 'totalAnalyses', label: 'Total Analyses', icon: Activity },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
  { key: 'failed', label: 'Failed', icon: XCircle },
  { key: 'signalProviders', label: 'Signal Providers', icon: Radio },
] as const;

export function MetricsGrid() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/metrics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch metrics');
        return res.json();
      })
      .then((data) => {
        setMetrics(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const verdictEntries = Object.entries(metrics.verdictDistribution ?? {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {METRIC_CARDS.map(({ key, label, icon: Icon }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metrics[key as keyof Metrics] as number}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {verdictEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Verdict Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {verdictEntries.map(([verdict, count]) => (
                <div key={verdict} className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${VERDICT_COLORS[verdict as Verdict]}20`,
                      color: VERDICT_COLORS[verdict as Verdict],
                    }}
                  >
                    {VERDICT_LABELS[verdict as Verdict] ?? verdict}
                  </Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
