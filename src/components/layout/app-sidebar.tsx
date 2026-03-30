'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/hooks';
import { LayoutDashboard, Lightbulb, GitCompareArrows, Settings, Shield, BarChart3, Zap, ArrowUpRight } from 'lucide-react';

const MENU_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ideas/new', label: 'My Ideas', icon: Lightbulb },
  { href: '/compare', label: 'Compare', icon: GitCompareArrows },
  { href: '/settings/billing', label: 'Billing', icon: BarChart3 },
];

const GENERAL_ITEMS = [
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const renderItem = (item: { href: string; label: string; icon: React.ElementType }) => {
    const isActive = pathname === item.href || (item.href !== '/settings' && pathname.startsWith(item.href + '/'));
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative',
          isActive
            ? 'text-[#9b8ce8] font-medium bg-[#9b8ce8]/10'
            : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
        )}
      >
        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#9b8ce8]" />}
        <item.icon className="h-[1.1rem] w-[1.1rem]" />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="flex w-56 flex-col">
      {/* Menu section */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2 px-1">Menu</p>
        <nav className="flex flex-col gap-0.5">
          {MENU_ITEMS.map(renderItem)}
        </nav>
      </div>

      {/* General section */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-2 px-1">General</p>
        <nav className="flex flex-col gap-0.5">
          {GENERAL_ITEMS.map(renderItem)}
          {profile?.role === 'admin' && renderItem({ href: '/admin', label: 'Admin', icon: Shield })}
        </nav>
      </div>

      {/* Upgrade card at bottom */}
      <div className="mt-auto px-4 pb-4">
        <div className="rounded-xl bg-gradient-to-br from-[#7c6ce7] to-[#6b5dd6] p-4 text-white shadow-lg shadow-[#9b8ce8]/10">
          <div className="h-9 w-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <p className="text-xs font-medium text-white/70">Need more credits?</p>
          <p className="text-sm font-semibold mt-0.5">Buy credit packs</p>
          <Link href="/settings/billing">
            <button className="mt-3 w-full rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#7c6ce7] hover:bg-white transition-colors flex items-center justify-center gap-1">
              Buy Credits <ArrowUpRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
