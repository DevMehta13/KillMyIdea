'use client';

import { MetricsGrid } from '@/components/admin/metrics-grid';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <MetricsGrid />
    </div>
  );
}
