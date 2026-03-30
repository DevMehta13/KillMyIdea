'use client';

import { UserTable } from '@/components/admin/user-table';

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">User Management</h1>
      <UserTable />
    </div>
  );
}
