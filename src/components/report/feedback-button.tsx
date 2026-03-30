/**
 * Feedback button — allows users to flag analysis quality issues (DEC-039).
 */

'use client';

import { useState } from 'react';
import { Flag, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackButtonProps {
  analysisRunId?: string;
}

const FEEDBACK_TYPES = [
  { value: 'inaccurate', label: 'Inaccurate analysis', desc: 'Scores or conclusions don\'t match reality' },
  { value: 'unhelpful', label: 'Unhelpful advice', desc: 'Next steps or suggestions aren\'t actionable' },
  { value: 'other', label: 'Other issue', desc: 'Something else about this report' },
] as const;

export function FeedbackButton({ analysisRunId }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!type) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_run_id: analysisRunId,
          type,
          message: message || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit feedback');
      }

      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      setTimeout(() => setIsOpen(false), 1500);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <button disabled className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500">
        <Check className="size-3.5 text-[#6ec88e]" />
        Feedback sent
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white">
        <Flag className="size-3.5" />
        Flag this analysis
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 space-y-3 w-full max-w-sm">
      <p className="text-sm font-medium text-zinc-200">What&apos;s wrong with this analysis?</p>

      <div className="space-y-2">
        {FEEDBACK_TYPES.map((ft) => (
          <label
            key={ft.value}
            className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer text-sm transition-colors ${
              type === ft.value ? 'border-[#9b8ce8]/50 bg-[#9b8ce8]/10' : 'border-white/[0.08] hover:bg-white/[0.04]'
            }`}
          >
            <input
              type="radio"
              name="feedback_type"
              value={ft.value}
              checked={type === ft.value}
              onChange={() => setType(ft.value)}
              className="mt-0.5 accent-[#9b8ce8]"
            />
            <div>
              <span className="font-medium text-zinc-200">{ft.label}</span>
              <p className="text-xs text-zinc-500">{ft.desc}</p>
            </div>
          </label>
        ))}
      </div>

      <textarea
        placeholder="Optional: tell us more..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={2000}
        className="w-full resize-none rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-[#9b8ce8]/50 focus:outline-none focus:ring-1 focus:ring-[#9b8ce8]/30"
      />

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={!type || isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:from-[#8b7cf0] hover:to-[#a99af0] disabled:opacity-40"
        >
          {isSubmitting ? <Loader2 className="size-3 animate-spin" /> : null}
          Submit
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
