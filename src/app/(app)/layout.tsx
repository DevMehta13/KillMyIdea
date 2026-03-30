'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppNavbar } from '@/components/layout/app-navbar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Zap } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <div className="app-dark flex flex-1">
        {/* Desktop sidebar with logo */}
        <div className="hidden lg:flex lg:flex-col lg:w-56 lg:border-r lg:border-white/5 lg:bg-[#222224]">
          {/* Logo in sidebar */}
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c6ce7] to-[#9b8ce8]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-[15px] text-white">Kill My Idea</span>
            </Link>
          </div>
          <AppSidebar />
        </div>

        {/* Mobile sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-56 p-0 bg-[#222224] border-r border-white/5">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c6ce7] to-[#9b8ce8]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-[15px] text-white">Kill My Idea</span>
            </div>
            <AppSidebar />
          </SheetContent>
        </Sheet>

        {/* Main content area */}
        <div className="flex flex-1 flex-col">
          <AppNavbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto bg-[#1a1a1c] p-5 sm:p-7">{children}</main>
        </div>
      </div>
    </>
  );
}
