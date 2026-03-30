'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { IdeasList } from '@/components/dashboard/ideas-list';
import { WelcomeBanner } from '@/components/dashboard/welcome-banner';
import { useAuth } from '@/lib/auth/hooks';
import {
  Lightbulb, Zap, BarChart3, TrendingUp, Coins, ArrowUpRight,
  Search, Filter, ChevronRight, Sparkles, Target, Shield
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { VERDICT_LABELS, VERDICT_COLORS } from '@/lib/constants';
import type { Verdict } from '@/types/database';

const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

const CHART_DATA = [
  { month: 'Jan', score: 3.2, credits: 2.0, confidence: 2.8 },
  { month: 'Feb', score: 3.8, credits: 2.5, confidence: 3.0 },
  { month: 'Mar', score: 5.1, credits: 3.2, confidence: 3.4 },
  { month: 'Apr', score: 6.4, credits: 3.8, confidence: 3.6 },
  { month: 'May', score: 7.8, credits: 4.5, confidence: 3.9 },
  { month: 'Jun', score: 8.5, credits: 5.0, confidence: 4.2 },
  { month: 'Jul', score: 9.2, credits: 4.8, confidence: 4.5 },
  { month: 'Aug', score: 7.5, credits: 4.2, confidence: 4.3 },
  { month: 'Sep', score: 6.8, credits: 3.5, confidence: 4.8 },
  { month: 'Oct', score: 5.5, credits: 3.8, confidence: 5.0 },
  { month: 'Nov', score: 4.8, credits: 4.0, confidence: 4.6 },
  { month: 'Dec', score: 5.2, credits: 4.5, confidence: 5.2 },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const { user, profile, isLoading } = useAuth();
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'there';
  const [ideas, setIdeas] = useState<Array<{ id: string; title: string; status: string; category: string | null; updated_at: string }>>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ideas')
      .then((res) => res.json())
      .then((data) => {
        setIdeas(data.ideas ?? []);
        setStatsLoading(false);
      })
      .catch(() => setStatsLoading(false));
  }, []);

  const totalIdeas = ideas.length;
  const completedIdeas = ideas.filter((i) => i.status === 'completed').length;
  const analyzingIdeas = ideas.filter((i) => i.status === 'analyzing').length;
  const credits = profile?.credit_balance ?? 0;

  return (
    <div className="space-y-6">
      {/* ─── Welcome Banner (onboarding) ─── */}
      <WelcomeBanner creditBalance={profile?.credit_balance ?? 0} ideaCount={totalIdeas} />

      {/* ─── Greeting + Actions ─── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[1.7rem] font-bold tracking-tight leading-tight text-white">{getGreeting()}, {displayName}</h1>
          <p className="text-sm text-zinc-500 mt-1">Here&apos;s an overview of your ideas and recent activity.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/ideas/new">
            <Button size="sm" className="rounded-lg bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] hover:from-[#8b7cf0] hover:to-[#a99af0] shadow-lg shadow-[#9b8ce8]/15 text-white gap-1.5">
              <Zap className="h-3.5 w-3.5" /> New Analysis
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── 4 Stat Cards (bigger, with subtitles) ─── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Coins className="h-5 w-5 text-[#6ec88e]" />}
          iconBg="bg-[#6ec88e]/10"
          value={isLoading ? null : credits}
          label="Credits Left"
          subtitle="Available for analysis"
          prefix=""
          glowColor="rgba(34,197,94,0.12)"
        />
        <StatCard
          icon={<Lightbulb className="h-5 w-5 text-[#d4a06b]" />}
          iconBg="bg-[#d4a06b]/10"
          value={statsLoading ? null : totalIdeas}
          label="Total Ideas"
          subtitle="Ideas Submitted"
          prefix=""
          glowColor="rgba(249,115,22,0.12)"
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5 text-[#d48aac]" />}
          iconBg="bg-[#d48aac]/10"
          value={statsLoading ? null : completedIdeas}
          label="Completed"
          subtitle="Analyses Finished"
          prefix=""
          glowColor="rgba(236,72,153,0.12)"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-[#7ea3d4]" />}
          iconBg="bg-[#7ea3d4]/10"
          value={statsLoading ? null : analyzingIdeas}
          label="In Progress"
          subtitle="Currently analyzing"
          prefix=""
          glowColor="rgba(59,130,246,0.12)"
        />
      </div>

      {/* ─── Middle row: Line Chart + Credit Card ─── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">

        {/* Analysis Overview — Recharts */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-6 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Analysis Overview</h2>
            <div className="flex items-center rounded-full overflow-hidden border border-white/[0.08] text-xs">
              <button className="px-4 py-1.5 text-zinc-500">Monthly</button>
              <button className="px-4 py-1.5 bg-[#7c6ce7] text-white rounded-full">Yearly</button>
            </div>
          </div>
          <div className="flex items-end justify-between mt-2 mb-4">
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold tracking-tight leading-none text-white">{totalIdeas > 0 ? '6.8' : '0.0'}<span className="text-lg font-normal text-zinc-600">/10</span></p>
              <span className="text-xs text-[#6ec88e] font-semibold flex items-center gap-0.5 mb-1.5"><ArrowUpRight className="h-3.5 w-3.5" /> 4.9%</span>
            </div>
            <div className="flex items-center gap-4 mb-1.5">
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block" /> Scores</span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" /> Credits</span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="h-2.5 w-2.5 rounded-full bg-emerald-200 inline-block" /> Confidence</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={CHART_DATA} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#555', fontSize: 12 }} dy={8} />
              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#555', fontSize: 11 }} dx={-5} ticks={[0, 2, 4, 6, 8, 10]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 12px', color: 'white', fontSize: '12px', fontWeight: 600 }}
                labelStyle={{ display: 'none' }}
                itemStyle={{ color: 'white', fontSize: '11px' }}
                cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '5 5', opacity: 0.3 }}
              />
              <Area type="monotone" dataKey="confidence" stroke="#a7f3d0" strokeWidth={2.5} fill="none" dot={false} />
              <Area type="monotone" dataKey="credits" stroke="#34d399" strokeWidth={2.5} fill="none" dot={false} />
              <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3.5} fill="url(#scoreGradient)" dot={false} activeDot={{ r: 6, fill: '#8b5cf6', stroke: 'white', strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          {/* Bottom stats row — fills remaining space */}
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-white/5">
            <div className="text-center">
              <p className="text-lg font-bold text-indigo-600">9.2</p>
              <p className="text-[10px] text-zinc-600">Highest Score</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-500">4.5</p>
              <p className="text-[10px] text-zinc-600">Avg Credits/Mo</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">Jul</p>
              <p className="text-[10px] text-zinc-600">Best Month</p>
            </div>
          </div>
        </div>

        {/* Right column: Credit Card + Quick Actions */}
        <div className="space-y-4">
          {/* Premium credit card — deep navy, gold chip, classy */}
          <div className="rounded-2xl overflow-hidden">
            <div className="text-sm font-semibold text-zinc-300 px-1 mb-2 flex items-center justify-between">
              <span>My Credits</span>
              <span className="text-xs text-zinc-500 font-normal">{credits} available</span>
            </div>
            <div className="relative rounded-2xl overflow-hidden h-48 shadow-xl" style={{ background: 'linear-gradient(160deg, #1a2744 0%, #1e3a5f 35%, #1a2f4e 65%, #15243d 100%)' }}>
              {/* Subtle light sweep — top-right glow like in photo */}
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/[0.04] blur-2xl" />

              {/* Decorative curved lines — like the swirl in the reference */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 192" fill="none" preserveAspectRatio="none">
                <path d="M-20 160 Q80 100 180 140 T380 80" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" fill="none" />
                <path d="M-20 180 Q100 110 200 150 T400 90" stroke="rgba(255,255,255,0.04)" strokeWidth="1" fill="none" />
              </svg>

              {/* "PREMIUM CREDIT" header text */}
              <div className="absolute top-4 left-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Premium Credit</p>
              </div>

              {/* Contactless icon — top right */}
              <div className="absolute top-4 right-5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white/30">
                  <path d="M8.5 16.5a7 7 0 010-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 14a4 4 0 010-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M5 19a10 10 0 010-14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>

              {/* Gold chip */}
              <div className="absolute top-12 left-5">
                <div className="h-9 w-12 rounded-md overflow-hidden" style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #ddb85a 30%, #b8923e 60%, #d4aa4c 100%)' }}>
                  <div className="h-full w-full grid grid-cols-3 gap-[1px] p-[3px]">
                    {[...Array(6)].map((_,i) => (
                      <div key={i} className="rounded-[1px]" style={{ backgroundColor: 'rgba(160,120,40,0.3)' }} />
                    ))}
                  </div>
                  {/* Center line on chip */}
                  <div className="absolute inset-y-0 left-1/2 w-[1px] -translate-x-1/2" style={{ backgroundColor: 'rgba(160,120,40,0.4)' }} />
                </div>
              </div>

              {/* Card number */}
              <div className="absolute bottom-[52px] left-5 flex gap-4 font-mono text-[15px] tracking-[0.15em] text-white/80">
                <span>••••</span>
                <span>••••</span>
                <span>••••</span>
                <span>{String(credits).padStart(4, '0')}</span>
              </div>

              {/* Card holder + valid from */}
              <div className="absolute bottom-3.5 left-5 right-5 flex justify-between items-end">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.15em] text-white/30 mb-0.5">Card Holder</p>
                  <p className="text-[13px] text-white/80 font-medium uppercase tracking-wide">{displayName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] uppercase tracking-[0.15em] text-white/30 mb-0.5">Credits</p>
                  <p className="text-[13px] text-white/80 font-mono font-medium">{credits}</p>
                </div>
              </div>
            </div>

            {/* Below card */}
            <div className="bg-white/[0.03] border border-white/[0.06] border-t-0 rounded-b-2xl px-4 py-3">
              <Link href="/settings/billing">
                <button className="w-full rounded-xl bg-[#1e3a5f] text-white/90 text-xs font-medium py-2.5 hover:bg-[#254a75] transition-colors border border-white/[0.08]">
                  Buy More Credits
                </button>
              </Link>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 overflow-hidden">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Quick Actions</h3>
            <div className="space-y-1">
              {[
                { href: '/ideas/new', icon: Sparkles, iconBg: 'bg-[#d4a06b]/10', iconColor: 'text-[#d4a06b]', label: 'Analyze New Idea', sub: 'Uses 1 Credit', glow: 'group-hover:shadow-amber-500/10' },
                { href: '/compare', icon: Target, iconBg: 'bg-[#7ea3d4]/10', iconColor: 'text-[#7ea3d4]', label: 'Compare Ideas', sub: 'Side by Side', glow: 'group-hover:shadow-blue-500/10' },
                { href: '/settings', icon: Shield, iconBg: 'bg-[#6ec88e]/10', iconColor: 'text-[#6ec88e]', label: 'Settings', sub: 'Profile & Billing', glow: 'group-hover:shadow-green-500/10' },
              ].map((a) => (
                <Link key={a.href} href={a.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.04] transition-all duration-200 group shadow-sm ${a.glow}`}>
                  <div className={`h-9 w-9 rounded-xl ${a.iconBg} flex items-center justify-center shrink-0 border border-white/[0.06]`}>
                    <a.icon className={`h-4 w-4 ${a.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-zinc-300 group-hover:text-white transition-colors">{a.label}</p>
                    <p className="text-[10px] text-zinc-600">{a.sub}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Recent Ideas Table ─── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="font-semibold text-white">Recent Ideas</h2>
            <p className="text-xs text-zinc-600 mt-0.5">{totalIdeas} idea{totalIdeas !== 1 ? 's' : ''} total</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/[0.08] px-3 py-1.5 text-xs text-zinc-500 bg-white/[0.03]">
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
            </div>
            <button className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-500 hover:bg-white/[0.06] transition-colors">
              <Filter className="h-3 w-3" /> Filter
            </button>
          </div>
        </div>
        <div>
          <IdeasList />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, value, label, subtitle, prefix, glowColor }: {
  icon: React.ReactNode; iconBg: string; value: number | null; label: string; subtitle: string; prefix: string; glowColor?: string;
}) {
  return (
    <div className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.07] p-5 transition-all duration-300 hover:scale-[1.02] hover:border-white/[0.12] overflow-hidden">
      {/* Subtle corner glow on hover */}
      <div
        className="absolute -top-12 -right-12 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: glowColor ?? 'rgba(139,92,246,0.15)' }}
      />

      <div className="relative">
        {/* Icon + value row */}
        <div className="flex items-start justify-between mb-4">
          <div className={`h-10 w-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 border border-white/[0.06]`}>
            {icon}
          </div>
          {value === null ? (
            <div className="h-8 w-12 bg-white/[0.06] animate-pulse rounded-lg" />
          ) : (
            <p className="text-3xl font-bold tracking-tight text-white tabular-nums">{prefix}{value.toLocaleString()}</p>
          )}
        </div>

        {/* Label + subtitle */}
        <div>
          <p className="text-sm font-medium text-zinc-300">{label}</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
