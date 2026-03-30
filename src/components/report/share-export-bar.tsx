'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Link2, RefreshCw, GitCompare, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { PDFExportButton } from './pdf/pdf-export-button';
import type { ReportContent } from '@/types/database';
import { trackEvent } from '@/lib/analytics';

interface ShareExportBarProps {
  ideaId: string;
  runId: string;
  reportId?: string;
  report?: ReportContent;
  ideaTitle?: string;
}

export function ShareExportBar({ ideaId, reportId, report, ideaTitle }: ShareExportBarProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyShareLink() {
    if (!reportId) {
      toast.error('Report not available for sharing yet');
      return;
    }

    setIsCopying(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create share link');
      }

      const { url } = await res.json();
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Share link copied to clipboard!');
      trackEvent({ name: 'report_shared', props: { ideaId } });
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#222224] px-5 py-2.5 sm:px-7">
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopyShareLink}
          disabled={isCopying || !reportId}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
        >
          {isCopying ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : copied ? (
            <Check className="size-3.5 text-[#6ec88e]" />
          ) : (
            <Link2 className="size-3.5" />
          )}
          {copied ? 'Copied!' : 'Share'}
        </button>

        {report && ideaTitle && (
          <PDFExportButton report={report} ideaTitle={ideaTitle} />
        )}
      </div>

      <div className="flex items-center gap-1">
        <Link href={`/ideas/${ideaId}`}>
          <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white">
            <RefreshCw className="size-3.5" />
            Re-run
          </button>
        </Link>
        <Link href="/compare">
          <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white">
            <GitCompare className="size-3.5" />
            Compare
          </button>
        </Link>
      </div>
    </div>
  );
}
