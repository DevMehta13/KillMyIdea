'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Trash2, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils/formatters';

interface ModerationItem {
  id: string;
  slug: string;
  reportType: string;
  ideaTitle: string;
  viewCount: number;
  created_at: string;
}

export function ModerationQueue() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/moderation')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch moderation queue');
        return res.json();
      })
      .then((data) => {
        setItems(data.items ?? []);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  function handleRemove() {
    toast.info('Coming soon');
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
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

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Flag className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">Moderation queue is empty</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium truncate">
              {item.ideaTitle}
            </CardTitle>
            <Button variant="destructive" size="sm" onClick={handleRemove}>
              <Trash2 className="mr-1 h-3 w-3" />
              Remove
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Badge variant="secondary">{item.reportType}</Badge>
              <span className="font-mono text-xs text-muted-foreground">
                /{item.slug}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                {item.viewCount} views
              </span>
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(item.created_at)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
