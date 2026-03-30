'use client';

import { PromptEditor } from '@/components/admin/prompt-editor';

export default function PromptEditorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Prompt Editor</h1>
      <PromptEditor />
    </div>
  );
}
