'use client';

import { ModerationQueue } from '@/components/admin/moderation-queue';

export default function ModerationPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moderation</h1>
      <ModerationQueue />
    </div>
  );
}
