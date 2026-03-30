'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { INPUT_LIMITS } from '@/lib/constants';
import { Loader2, ArrowLeft, ArrowRight, Zap, CheckCircle2, FileText, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3;

const STEPS = [
  { label: 'Describe', icon: FileText },
  { label: 'Details', icon: Zap },
  { label: 'Submit', icon: Send },
];

export default function NewIdeaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [problemStatement, setProblemStatement] = useState('');

  const canProceedStep1 =
    title.length >= INPUT_LIMITS.ideaTitle.min &&
    rawInput.length >= INPUT_LIMITS.ideaRawInput.min;

  async function handleSubmit() {
    setIsLoading(true);
    setError('');
    try {
      const createRes = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          raw_input: rawInput,
          target_user: targetUser || undefined,
          problem_statement: problemStatement || undefined,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create idea');
      }
      const idea = await createRes.json();
      const analyzeRes = await fetch(`/api/ideas/${idea.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({}));
        if (analyzeRes.status === 402) throw new Error('Insufficient credits. Buy more credits to continue.');
        throw new Error(err.message || 'Failed to start analysis');
      }
      const { run_id } = await analyzeRes.json();
      toast.success('Analysis started!');
      router.push(`/ideas/${idea.id}/report/${run_id}/progress`);
    } catch (e) {
      setError((e as Error).message);
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Analyze a New Idea</h1>
        <p className="text-sm text-zinc-500 mt-1">Fill in the details and our AI will evaluate your idea across 7 dimensions.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div className={cn(
              'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all flex-1',
              i + 1 === step ? 'bg-[#7ea3d4]/10 text-[#7ea3d4] font-medium border border-[#7ea3d4]/20' :
              i + 1 < step ? 'bg-[#6ec88e]/10 text-[#6ec88e] border border-[#6ec88e]/20' :
              'bg-white/[0.04] text-zinc-400 border border-white/[0.08]'
            )}>
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-lg text-xs shrink-0',
                i + 1 === step ? 'bg-[#7c6ce7] text-white' :
                i + 1 < step ? 'bg-[#6ec88e] text-white' : 'bg-white/[0.06] text-zinc-400'
              )}>
                {i + 1 < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-white/[0.08] shrink-0" />}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-sm p-6 md:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Describe your idea</h2>
            <p className="text-sm text-zinc-500 mt-0.5">What&apos;s the core concept?</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-zinc-200">Idea title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., AI-powered meal planning for busy parents" maxLength={INPUT_LIMITS.ideaTitle.max} className="rounded-xl" />
            <p className="text-xs text-zinc-400 text-right">{title.length}/{INPUT_LIMITS.ideaTitle.max}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="raw_input" className="text-sm font-medium text-zinc-200">Describe your idea in detail</Label>
            <Textarea id="raw_input" value={rawInput} onChange={(e) => setRawInput(e.target.value)} placeholder="What does it do? Who is it for? How does it work? What problem does it solve?" rows={6} maxLength={INPUT_LIMITS.ideaRawInput.max} className="rounded-xl resize-none" />
            <p className="text-xs text-zinc-400 text-right">{rawInput.length}/{INPUT_LIMITS.ideaRawInput.max}</p>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="rounded-xl bg-[#7c6ce7] hover:bg-[#6b5dd6] text-white gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-sm p-6 md:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Optional details</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Help our AI understand your idea better. You can skip these.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="target_user" className="text-sm font-medium text-zinc-200">Who is your target user?</Label>
            <Input id="target_user" value={targetUser} onChange={(e) => setTargetUser(e.target.value)} placeholder="e.g., Working parents aged 25-40" maxLength={INPUT_LIMITS.ideaTargetUser.max} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="problem" className="text-sm font-medium text-zinc-200">What problem does it solve?</Label>
            <Textarea id="problem" value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} placeholder="e.g., Parents waste 5+ hours/week deciding what to cook..." rows={3} maxLength={INPUT_LIMITS.ideaProblemStatement.max} className="rounded-xl resize-none" />
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl gap-2 text-zinc-500"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={() => setStep(3)} className="rounded-xl bg-[#7c6ce7] hover:bg-[#6b5dd6] text-white gap-2">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] shadow-sm p-6 md:p-8 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-white">Review and Submit</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Make sure everything looks right.</p>
          </div>
          <div className="rounded-xl bg-[#1a1a1c] p-5 space-y-2 text-sm">
            <div><span className="font-medium text-zinc-300">Title:</span> <span className="text-zinc-400">{title}</span></div>
            <div><span className="font-medium text-zinc-300">Description:</span> <span className="text-zinc-400">{rawInput.slice(0, 200)}{rawInput.length > 200 ? '...' : ''}</span></div>
            {targetUser && <div><span className="font-medium text-zinc-300">Target user:</span> <span className="text-zinc-400">{targetUser}</span></div>}
            {problemStatement && <div><span className="font-medium text-zinc-300">Problem:</span> <span className="text-zinc-400">{problemStatement}</span></div>}
          </div>
          <div className="rounded-xl bg-[#7ea3d4]/10 border border-[#7ea3d4]/20 px-4 py-3 flex items-center gap-3">
            <Zap className="h-5 w-5 text-[#7ea3d4] shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-[#7ea3d4]">This will use 1 credit</p>
              <p className="text-[#7ea3d4] text-xs">The analysis takes about 30-60 seconds.</p>
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="rounded-xl gap-2 text-zinc-500"><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button onClick={handleSubmit} disabled={isLoading} className="rounded-xl bg-[#7c6ce7] hover:bg-[#6b5dd6] text-white gap-2 shadow-md shadow-[#7c6ce7]/20">
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Starting...</> : <><Zap className="h-4 w-4" /> Analyze (1 credit)</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
