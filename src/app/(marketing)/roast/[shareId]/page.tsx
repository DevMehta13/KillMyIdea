'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap } from 'lucide-react';
import { ReportPreview } from '@/components/report/report-preview';

interface RoastData {
  report: {
    first_impression: string;
    biggest_flaw: string;
    what_to_clarify: string;
  };
  idea_title: string;
  is_quick_roast: boolean;
}

export default function PublicRoastPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [data, setData] = useState<RoastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/share/${shareId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Roast not found');
        return res.json();
      })
      .then((d) => { setData(d); setIsLoading(false); })
      .catch((e) => { setError(e.message); setIsLoading(false); });
  }, [shareId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Roast not found.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const roast = data.report;

  return (
    <div className="mx-auto max-w-lg px-4 py-12 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Quick Roast</h1>
        <p className="text-muted-foreground mt-1">{data.idea_title}</p>
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="space-y-4 pt-4">
          <div>
            <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">First Impression</p>
            <p className="text-sm mt-1">{roast.first_impression}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Biggest Flaw</p>
            <p className="text-sm mt-1">{roast.biggest_flaw}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">What to Clarify</p>
            <p className="text-sm mt-1">{roast.what_to_clarify}</p>
          </div>
        </CardContent>
      </Card>

      <ReportPreview
        ctaHref="/signup"
        ctaText="Sign Up for Full Report"
      />

      <div className="rounded-lg border-2 p-6 text-center" style={{ borderColor: 'var(--brand-primary)' }}>
        <p className="text-lg font-semibold">Get your own roast</p>
        <p className="text-sm text-muted-foreground mt-1">Paste your idea and get instant feedback.</p>
        <Link href="/" className="mt-4 inline-block">
          <Button style={{ backgroundColor: 'var(--brand-primary)' }} className="text-white">
            <Zap className="mr-2 h-4 w-4" /> Roast My Idea
          </Button>
        </Link>
      </div>
    </div>
  );
}
