'use client';

import { JobTable } from '@/components/admin/job-table';

export default function JobMonitorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Job Monitor</h1>
      <JobTable />
    </div>
  );
}
