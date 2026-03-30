'use client';

import { useState } from 'react';
import { AppNavbar } from '@/components/layout/app-navbar';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-dark">
      <AppNavbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 bg-[#1a1a1c]">
        <div className="hidden lg:block">
          <AdminSidebar />
        </div>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-56 p-0">
            <AdminSidebar />
          </SheetContent>
        </Sheet>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#1a1a1c]">{children}</main>
      </div>
    </div>
  );
}
