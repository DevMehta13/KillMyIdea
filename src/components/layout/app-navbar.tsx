'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/hooks';
import { CreditCard, LogOut, Settings, User, Menu, Zap, Search, Bell } from 'lucide-react';

interface AppNavbarProps {
  onMenuClick?: () => void;
}

export function AppNavbar({ onMenuClick }: AppNavbarProps) {
  const { user, profile, isLoading, signOut } = useAuth();

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const email = profile?.email || user?.email || '';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#222224]/95 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Left: menu + page title area */}
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Toggle menu">
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6ce7] to-[#9b8ce8]">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-white">Kill My Idea</span>
          </Link>
          <span className="hidden lg:block font-semibold text-white">Overview</span>
        </div>

        {/* Center: search bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="flex items-center gap-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-zinc-500">
            <Search className="h-4 w-4" />
            <span>Search anything...</span>
          </div>
        </div>

        {/* Right: notifications + avatar */}
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-lg border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.06] transition-colors" aria-label="Notifications">
            <Bell className="h-4 w-4 text-zinc-500" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-white/[0.08] py-1 pl-1 pr-3 hover:bg-white/[0.06] transition-colors">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-[#7c6ce7] text-white text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-zinc-200 leading-none">{displayName}</p>
                  <p className="text-[10px] text-zinc-500 leading-none mt-0.5">{profile?.plan ?? 'free'}</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl bg-[#2a2a2c] border border-white/[0.08] text-zinc-200">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">{displayName}</p>
                <p className="text-xs text-zinc-500 truncate">{email}</p>
              </div>
              <DropdownMenuSeparator className="bg-white/[0.08]" />
              <DropdownMenuItem className="text-zinc-300 focus:bg-white/[0.08] focus:text-white">
                <Link href="/settings" className="flex w-full items-center">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-zinc-300 focus:bg-white/[0.08] focus:text-white">
                <Link href="/settings/billing" className="flex w-full items-center">
                  <CreditCard className="mr-2 h-4 w-4" /> Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-zinc-300 focus:bg-white/[0.08] focus:text-white">
                <Link href="/settings" className="flex w-full items-center">
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.08]" />
              <DropdownMenuItem onClick={signOut} className="text-[#d47070] focus:bg-[#d47070]/10 focus:text-[#d47070]">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
