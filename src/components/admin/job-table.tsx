'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils/formatters';
import type { Verdict } from '@/types/database';

interface Job {
  id: string;
  status: string;
  ideaTitle: string;
  verdict: Verdict | null;
  overallScore: number | null;
  modelUsed: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  queued: 'bg-gray-100 text-gray-700',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'interpreting', label: 'Interpreting' },
  { value: 'collecting_signals', label: 'Collecting Signals' },
  { value: 'scoring', label: 'Scoring' },
];

export function JobTable() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchJobs = useCallback((status: string) => {
    setIsLoading(true);
    const url = status === 'all' ? '/api/admin/jobs' : `/api/admin/jobs?status=${status}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch jobs');
        return res.json();
      })
      .then((data) => {
        setJobs(data.jobs ?? []);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchJobs(statusFilter);
  }, [statusFilter, fetchJobs]);

  async function handleRetry(runId: string) {
    setRetrying(runId);
    try {
      const res = await fetch(`/api/admin/jobs/${runId}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('Retry failed');
      toast.success('Job retry initiated');
      fetchJobs(statusFilter);
    } catch {
      toast.error('Failed to retry job');
    } finally {
      setRetrying(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No jobs found.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Idea Title</TableHead>
                <TableHead>Verdict</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[job.status] ?? 'bg-yellow-100 text-yellow-700'}
                    >
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">
                    {job.ideaTitle}
                  </TableCell>
                  <TableCell>
                    {job.verdict ? (
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `${VERDICT_COLORS[job.verdict]}20`,
                          color: VERDICT_COLORS[job.verdict],
                        }}
                      >
                        {VERDICT_LABELS[job.verdict] ?? job.verdict}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {job.overallScore != null ? job.overallScore.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {job.modelUsed ?? '-'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelativeTime(job.created_at)}
                  </TableCell>
                  <TableCell>
                    {job.status === 'failed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={retrying === job.id}
                        onClick={() => handleRetry(job.id)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        {retrying === job.id ? 'Retrying...' : 'Retry'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
