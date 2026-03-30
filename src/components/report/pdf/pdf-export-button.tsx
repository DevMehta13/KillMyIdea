/**
 * PDF export button with dynamic import (DEC-027).
 * Loads @react-pdf/renderer only when user clicks export.
 * Avoids ~400KB bundle bloat on initial page load.
 */

'use client';

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportContent } from '@/types/database';
import { trackEvent } from '@/lib/analytics';

interface PDFExportButtonProps {
  report: ReportContent;
  ideaTitle: string;
}

export function PDFExportButton({ report, ideaTitle }: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleExport() {
    setIsGenerating(true);
    try {
      const [{ pdf }, { ReportPDFDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./report-pdf-document'),
      ]);

      const blob = await pdf(
        ReportPDFDocument({ report, ideaTitle })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Kill-My-Idea-Report-${ideaTitle.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('PDF downloaded!');
      trackEvent({ name: 'pdf_exported', props: { ideaId: ideaTitle } });
    } catch (e) {
      console.error('[PDF Export]', e);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isGenerating}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
    >
      {isGenerating ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <FileDown className="size-3.5" />
      )}
      {isGenerating ? 'Generating...' : 'Export PDF'}
    </button>
  );
}
