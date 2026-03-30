'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/hooks';
import {
  Loader2, Mail, User, CreditCard, Shield, Calendar, Pencil, Check,
  Coins, Crown, Lock, History, LogOut, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/formatters';

export default function SettingsPage() {
  const { user, profile, isLoading: authLoading, refreshProfile, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const name = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = name.slice(0, 2).toUpperCase();
  const email = profile?.email || user?.email || '';

  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);

  async function handleSave() {
    if (!displayName.trim()) { toast.error('Display name cannot be empty'); return; }
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update');
      await refreshProfile();
      toast.success('Profile updated');
      setIsEditing(false);
    } catch { toast.error('Failed to update profile'); }
    finally { setIsSaving(false); }
  }

  if (authLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-32 bg-white/[0.06] animate-pulse rounded-2xl" />
        <div className="h-64 bg-white/[0.06] animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ─── Profile Header Banner ─── */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-r from-[#9b8ce8]/10 via-[#9b8ce8]/5 to-[#7ea3d4]/10" />

        {/* Avatar overlapping */}
        <div className="px-6 pb-5">
          <div className="flex items-end justify-between -mt-10">
            <div className="flex items-end gap-4">
              <Avatar className="h-20 w-20 border-4 border-white/[0.08] shadow-lg">
                <AvatarFallback className="text-2xl font-bold bg-[#7c6ce7] text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="pb-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold text-white">{name}</h1>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#6ec88e]/10 text-[#6ec88e] px-2 py-0.5 rounded-full">
                    <Check className="h-2.5 w-2.5" /> Verified
                  </span>
                </div>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                  <Calendar className="h-3 w-3" />
                  Member since {profile?.created_at ? formatDate(profile.created_at) : '—'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-white/[0.08] text-zinc-400 gap-1.5 text-xs mb-1"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Pencil className="h-3 w-3" /> Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Profile Details Grid ─── */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">Profile details</h2>
          {isEditing && (
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="rounded-lg bg-[#7c6ce7] hover:bg-violet-700 text-white text-xs gap-1">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5">
          {/* Full Name */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Full Name</p>
            {isEditing ? (
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-lg h-9 text-sm" />
            ) : (
              <p className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-zinc-400" /> {name}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-zinc-400" /> {email}
            </p>
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#6ec88e] bg-[#6ec88e]/10 px-1.5 py-0.5 rounded mt-1">
              <Check className="h-2 w-2" /> Email Verified
            </span>
          </div>

          {/* Join Date */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Member Since</p>
            <p className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" /> {profile?.created_at ? formatDate(profile.created_at) : '—'}
            </p>
          </div>

          {/* Role */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Role</p>
            <p className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-zinc-400" /> {profile?.role ?? 'registered'}
            </p>
          </div>

          {/* Plan */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Plan</p>
            <p className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
              <Crown className="h-3.5 w-3.5 text-zinc-400" /> {(profile?.plan ?? 'free').charAt(0).toUpperCase() + (profile?.plan ?? 'free').slice(1)} Plan
            </p>
          </div>

          {/* Credits */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Credits</p>
            <p className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-zinc-400" /> {profile?.credit_balance ?? 0} remaining
            </p>
          </div>
        </div>
      </div>

      {/* ─── Security Card (like 2FA in reference) ─── */}
      <div className="rounded-2xl bg-gradient-to-r from-[#9b8ce8]/10 via-[#9b8ce8]/5 to-white/[0.04] border border-[#9b8ce8]/20 p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-[#9b8ce8]/10 flex items-center justify-center shrink-0">
          <Lock className="h-6 w-6 text-[#9b8ce8]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white">Account Security</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Keep your account secure with a strong password. Two-factor authentication coming soon.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg border-[#9b8ce8]/20 text-[#9b8ce8] hover:bg-[#9b8ce8]/10 shrink-0">
          Manage
        </Button>
      </div>

      {/* ─── Quick Links ─── */}
      <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.08]">
          <h2 className="font-semibold text-white text-sm">Account</h2>
        </div>
        <div>
          <Link href="/settings/billing" className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.04] transition-colors border-b border-white/5">
            <span className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="h-8 w-8 rounded-lg bg-[#6ec88e]/10 flex items-center justify-center"><CreditCard className="h-4 w-4 text-[#6ec88e]" /></div>
              Billing & Credits
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">{profile?.credit_balance ?? 0} credits</span>
              <ChevronRight className="h-4 w-4 text-zinc-300" />
            </div>
          </Link>
          <Link href="/dashboard" className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.04] transition-colors border-b border-white/5">
            <span className="flex items-center gap-3 text-sm text-zinc-300">
              <div className="h-8 w-8 rounded-lg bg-[#7ea3d4]/10 flex items-center justify-center"><History className="h-4 w-4 text-[#7ea3d4]" /></div>
              Activity History
            </span>
            <ChevronRight className="h-4 w-4 text-zinc-300" />
          </Link>
          <button onClick={signOut} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#d47070]/10 transition-colors text-left">
            <span className="flex items-center gap-3 text-sm text-[#d47070]">
              <div className="h-8 w-8 rounded-lg bg-[#d47070]/10 flex items-center justify-center"><LogOut className="h-4 w-4 text-[#d47070]" /></div>
              Sign Out
            </span>
            <ChevronRight className="h-4 w-4 text-red-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
