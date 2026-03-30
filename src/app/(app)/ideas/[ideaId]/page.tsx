'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/utils/formatters';
import type { Verdict } from '@/types/database';
import { ArrowLeft, Play, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface IdeaData {
  id: string; title: string; raw_input: string; target_user: string | null;
  problem_statement: string | null; status: string; category: string | null; created_at: string;
}

interface RunData {
  id: string; status: string; verdict: Verdict | null; overall_score: number | null;
  created_at: string; completed_at: string | null;
}

export default function IdeaDetailPage() {
  const { ideaId } = useParams<{ ideaId: string }>();
  const router = useRouter();
  const [idea, setIdea] = useState<IdeaData | null>(null);
  const [runs, setRuns] = useState<RunData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editRawInput, setEditRawInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    fetch(`/api/ideas/${ideaId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((d) => {
        if (d) {
          setIdea(d.idea);
          setRuns(d.analysis_runs ?? []);
          setEditTitle(d.idea.title);
          setEditRawInput(d.idea.raw_input);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [ideaId]);

  async function handleEdit() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, raw_input: editRawInput }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setIdea((prev) => prev ? { ...prev, ...updated } : prev);
      setShowEdit(false);
      toast.success('Idea updated');
    } catch {
      toast.error('Failed to update idea');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this idea? This cannot be undone.')) return;
    try {
      await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' });
      toast.success('Idea deleted');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to delete');
    }
  }

  async function handleReAnalyze() {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed');
      }
      const { run_id } = await res.json();
      router.push(`/ideas/${ideaId}/report/${run_id}/progress`);
    } catch (e) {
      toast.error((e as Error).message);
      setIsAnalyzing(false);
    }
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-64 bg-white/[0.06]" /><Skeleton className="h-40 w-full bg-white/[0.06]" /></div>;
  if (!idea) return <Alert variant="destructive"><AlertDescription>Idea not found.</AlertDescription></Alert>;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="text-zinc-400 hover:text-white hover:bg-white/[0.06]">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate text-white">{idea.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium text-zinc-400 bg-white/[0.06] border border-white/[0.08] rounded-full px-2.5 py-0.5">{idea.status}</span>
            {idea.category && <span className="text-xs font-medium text-[#9b8ce8] bg-[#9b8ce8]/10 border border-[#9b8ce8]/20 rounded-full px-2.5 py-0.5">{idea.category}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowEdit(true)} className="text-zinc-400 hover:text-white hover:bg-white/[0.06]">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-[#d47070] hover:text-[#d47070] hover:bg-[#d47070]/10">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description card */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 md:p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Description</h3>
        <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{idea.raw_input}</p>
        {idea.target_user && (
          <p className="text-sm text-zinc-400 mt-3"><strong className="text-zinc-300">Target:</strong> {idea.target_user}</p>
        )}
        {idea.problem_statement && (
          <p className="text-sm text-zinc-400 mt-2"><strong className="text-zinc-300">Problem:</strong> {idea.problem_statement}</p>
        )}
      </div>

      {/* Analysis runs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Analysis Runs</h2>
          <Button size="sm" onClick={handleReAnalyze} disabled={isAnalyzing || idea.status === 'analyzing'} className="rounded-xl bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] hover:from-[#8b7cf0] hover:to-[#a99af0] text-white border-0 shadow-lg shadow-[#9b8ce8]/15">
            {isAnalyzing ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Starting...</> : <><Play className="mr-2 h-3 w-3" /> Re-analyze</>}
          </Button>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] py-8 text-center text-zinc-500">
            No Analyses Yet
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map((run) => (
              <Link key={run.id} href={run.status === 'completed' ? `/ideas/${ideaId}/report/${run.id}` : `/ideas/${ideaId}/report/${run.id}/progress`}>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] transition-all duration-200 cursor-pointer px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-400 bg-white/[0.06] border border-white/[0.08] rounded-full px-2.5 py-0.5">{run.status}</span>
                    <span className="text-xs text-zinc-500">{formatRelativeTime(run.created_at)}</span>
                  </div>
                  {run.verdict && (
                    <Badge style={{ backgroundColor: VERDICT_COLORS[run.verdict], color: 'white' }} className="border-0">
                      {VERDICT_LABELS[run.verdict]} — {run.overall_score?.toFixed(1)}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-[#2a2a2c] border border-white/[0.08]">
          <DialogHeader><DialogTitle className="text-white">Edit Idea</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-zinc-300">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-white/[0.04] border-white/[0.12]" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-300">Description</Label>
              <Textarea value={editRawInput} onChange={(e) => setEditRawInput(e.target.value)} rows={5} className="bg-white/[0.04] border-white/[0.12]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowEdit(false)} className="text-zinc-400 hover:text-white">Cancel</Button>
            <Button onClick={handleEdit} disabled={isSaving} className="bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] text-white border-0">
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
