'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  Menu, X, Zap, Search, Brain, Shield, BarChart3,
  LayoutDashboard, LogOut, ChevronDown, Target, AlertTriangle,
  ArrowRight, CheckCircle2, Sparkles, Star, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuickRoastForm } from '@/components/marketing/quick-roast-form';
import { useAuth } from '@/lib/auth/hooks';
import { cn } from '@/lib/utils';
import { CREDIT_PACKAGES } from '@/lib/constants';

// ─── Single IntersectionObserver for all scroll reveals ─────────────────────
// One observer handles every `.reveal` element on the page.
// No React state, no re-renders, pure DOM class toggle → zero jank.

function useScrollReveal() {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    // Small delay to ensure DOM is ready after hydration/navigation
    const timer = setTimeout(() => {
      const elements = document.querySelectorAll('.reveal, .reveal-scale');
      if (elements.length === 0) return;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer?.unobserve(entry.target);
            }
          }
        },
        { rootMargin: '0px 0px -40px 0px', threshold: 0.05 }
      );

      elements.forEach((el) => observer!.observe(el));
    }, 50);

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);
}

/** Returns true after first client render. Used to defer animation classes to avoid hydration mismatch. */
function useMounted() {
  const [m, setM] = React.useState(false);
  useEffect(() => { setM(true); }, []);
  return m;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function HeroSectionNew() {
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);
  const mounted = useMounted();
  useScrollReveal();

  const faqs = [
    { q: 'What is Kill My Idea?', a: 'An AI-powered startup idea evaluation platform that gives you a brutally honest verdict backed by real competitor data, market signals, and structured scoring across 7 dimensions.' },
    { q: 'How does the analysis work?', a: 'You submit your idea, answer clarification questions, then our AI collects real market signals, scores your idea across demand, urgency, distribution, differentiation, competition, monetization, and execution, and delivers a verdict with evidence.' },
    { q: 'What are the 5 possible verdicts?', a: 'Pursue (strong evidence to build), Refine (promising but needs adjustments), Test First (validate key assumptions), Drop (evidence suggests this won\'t work), and Insufficient Data (not enough signal to judge).' },
    { q: 'Is the Quick Roast free?', a: 'Yes, completely free with no signup. For the full analysis, you get 3 free credits on signup.' },
    { q: 'What makes this different from ChatGPT?', a: 'We collect real data — actual competitor names with pricing, community discussions, market size — and run it through a scoring engine with guardrail overrides that prevent false confidence.' },
  ];

  return (
    <>
      <HeroHeader />
      <main className="bg-[#1a1a1c] text-white">

        {/* ─── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative min-h-[100vh] flex items-center overflow-hidden dot-bg">
          {/* Animated gradient mesh blobs — CSS only */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-[#c4856b]/12 blur-[160px] animate-[drift_20s_ease-in-out_infinite]" />
            <div className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-[#d4a088]/10 blur-[160px] animate-[drift_25s_ease-in-out_infinite_reverse]" />
            <div className="absolute top-1/4 right-1/4 h-[40%] w-[40%] rounded-full bg-[#b8917a]/[0.08] blur-[120px] animate-[drift_18s_ease-in-out_infinite_2s]" />
          </div>

          {/* Dot pattern applied via .dot-bg class on this section */}

          <div className="relative w-full pt-24 pb-32 px-6">
            {/* ── Floating cards — CSS animations, no JS ── */}
            <div className="hidden lg:block pointer-events-none select-none">

              {/* TOP LEFT — Sticky note (glassmorphism) */}
              <div className={cn("absolute top-8 left-[1%] xl:left-[4%] w-64 xl:w-72 rotate-[-7deg] z-10", mounted && "hero-card-enter hero-card-enter-1")}>
                <div className="float-bob">
                  <div className="relative rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(139,92,246,0.08)]">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#9b8ce8] to-[#b8a5f0] shadow-lg shadow-[#9b8ce8]/20 flex items-center justify-center">
                        <div className="h-2 w-2 rounded-full bg-white/40" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-zinc-300 italic leading-relaxed mt-2">
                      &quot;Score your idea across 7 dimensions with real competitor data and market signals.&quot;
                    </p>
                  </div>
                  <div className="mt-4 ml-6">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#9b8ce8] to-[#b8a5f0] px-4 py-2.5 shadow-xl shadow-[#9b8ce8]/15">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* TOP RIGHT — Analysis result */}
              <div className={cn("absolute top-4 right-[1%] xl:right-[3%] w-72 xl:w-80 rotate-[5deg] z-10", mounted && "hero-card-enter hero-card-enter-2")}>
                <div className="float-bob-slow">
                  <div className="rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(59,130,246,0.08)]">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-base font-bold text-white">Latest Analysis</p>
                        <p className="text-xs text-zinc-500 mt-0.5">AI Meeting Summarizer</p>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-white/[0.06] flex items-center justify-center border border-white/[0.08]">
                        <Clock className="h-6 w-6 text-zinc-500" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1.5 rounded-full text-sm border border-emerald-500/20">Pursue</div>
                      <div className="text-sm text-zinc-400 font-medium">Score: 7.2 / 10</div>
                    </div>
                    <div className="border-t border-white/[0.06] pt-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Clock className="h-4 w-4" />
                        <span>Completed 2 minutes ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM LEFT — Score bars */}
              <div className={cn("absolute bottom-4 left-[0%] xl:left-[2%] w-80 xl:w-[22rem] rotate-[-3deg] z-10", mounted && "hero-card-enter hero-card-enter-3")}>
                <div className="float-bob">
                  <div className="rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(139,92,246,0.06)]">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-base font-bold text-white">Dimension Scores</p>
                      <BarChart3 className="h-5 w-5 text-zinc-600" />
                    </div>
                    <div className="space-y-3">
                      {[
                        { name: 'Demand', score: 78, color: 'bg-emerald-500' },
                        { name: 'Urgency', score: 65, color: 'bg-emerald-400' },
                        { name: 'Distribution', score: 52, color: 'bg-yellow-500' },
                        { name: 'Competition', score: 41, color: 'bg-[#d47070]' },
                        { name: 'Monetization', score: 69, color: 'bg-[#7ea3d4]' },
                      ].map((d) => (
                        <div key={d.name} className="flex items-center gap-3">
                          <span className="text-sm text-zinc-500 w-28 shrink-0">{d.name}</span>
                          <div className="flex-1 h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full ${d.color} bar-animate`} style={{ width: `${d.score}%` }} />
                          </div>
                          <span className="text-sm font-mono font-bold text-zinc-300 w-10 text-right">{(d.score / 10).toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM RIGHT — Competitors */}
              <div className={cn("absolute bottom-12 right-[0%] xl:right-[2%] w-72 xl:w-76 rotate-[4deg] z-10", mounted && "hero-card-enter hero-card-enter-4")}>
                <div className="float-bob-slow">
                  <div className="rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl p-6 shadow-[0_0_40px_rgba(6,182,212,0.06)]">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-base font-bold text-white">Competitors</p>
                      <span className="text-xs font-medium bg-[#7ea3d4]/10 text-[#7ea3d4] px-2.5 py-1 rounded-full border border-[#7ea3d4]/20">3 found</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { name: 'Otter.ai', price: '$16.99/mo', users: '25M users', color: 'bg-[#7c6ce7]' },
                        { name: 'Fireflies.ai', price: '$19/mo', users: '300K teams', color: 'bg-[#7c6ce7]' },
                        { name: 'Fathom', price: 'Free tier', users: '50K users', color: 'bg-emerald-600' },
                      ].map((c) => (
                        <div key={c.name} className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl ${c.color} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                            {c.name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-200">{c.name}</p>
                            <p className="text-xs text-zinc-500">{c.price} · {c.users}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Center content — animation classes deferred until mounted ── */}
            <div className="mx-auto max-w-3xl text-center relative z-20">
              <div className={cn("mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.1] backdrop-blur-xl shadow-[0_0_40px_rgba(139,92,246,0.15)]", mounted && "hero-icon-enter")}>
                <Zap className="h-7 w-7 text-[#9b8ce8]" />
              </div>

              <h1 className={cn("text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight", mounted && "hero-enter hero-enter-2")}>
                Validate, score, and decide
              </h1>
              <p className={cn("text-5xl md:text-6xl lg:text-7xl font-light italic tracking-tight mt-1 text-gradient", mounted && "hero-enter hero-enter-2")}>
                before you build
              </p>

              <p className={cn("mt-8 text-lg md:text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed", mounted && "hero-enter hero-enter-3")}>
                AI-powered idea evaluation with real market data, competitor analysis, and brutally honest scoring.
              </p>

              <div className={cn("mt-10", mounted && "hero-enter hero-enter-4")}>
                <Link href="/signup">
                  <Button size="lg" className="group rounded-xl px-10 h-13 text-base bg-white text-[#1a1a1c] hover:bg-zinc-100 shadow-lg shadow-white/10 transition-all hover:-translate-y-0.5 border-0">
                    Get started free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ──────────────────────────────────────────────── */}
        <section className="py-28 md:py-36 bg-[#1a1a1c] relative overflow-hidden">
          <div className="absolute top-0 right-1/4 h-[600px] w-[600px] rounded-full bg-[#7c6ce7]/[0.04] blur-[150px] pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="reveal text-center mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] px-4 py-1.5 text-xs font-medium text-zinc-400">
                <Sparkles className="h-3 w-3" />
                How it works
              </span>
            </div>
            <h2 className="reveal delay-1 text-center text-4xl md:text-5xl font-bold leading-tight max-w-2xl mx-auto">
              Validate your startup&apos;s
              <br />
              <span className="bg-gradient-to-r from-[#9b8ce8] via-[#b8a5f0] to-[#c4b5f5] bg-clip-text text-transparent">biggest assumptions</span>
            </h2>

            <div className="mt-16 grid gap-10 md:grid-cols-3">
              {[
                { title: 'Describe your idea', desc: 'Share your startup concept and answer AI-driven clarification questions to sharpen the evaluation.' },
                { title: 'We gather real signals', desc: 'AI finds actual competitors with pricing, collects community discussions, and sizes your market.' },
                { title: 'Get your verdict', desc: 'Receive a structured verdict with scores, evidence, red flags, green flags, and next steps.' },
              ].map((s, i) => (
                <div key={i} className={`reveal delay-${i + 1} text-center`}>
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-b from-[#9b8ce8]/20 to-[#7ea3d4]/10 border border-white/[0.08]">
                    <span className="text-lg font-bold bg-gradient-to-r from-[#9b8ce8] to-[#b8a5f0] bg-clip-text text-transparent">{i + 1}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed max-w-[280px] mx-auto">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Product mockup */}
            <div className="mt-24 relative mx-auto max-w-5xl reveal-scale">
              <div className="hidden md:block">
                <div className="absolute -left-4 top-1/3 z-20 reveal delay-2">
                  <div className="h-16 w-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl shadow-[0_0_30px_rgba(139,92,246,0.1)] flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">7</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 text-center mt-1">dimensions</p>
                </div>
                <div className="absolute -right-2 top-8 z-20 reveal delay-3">
                  <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2.5 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                    <p className="text-sm font-bold text-emerald-400">Pursue ✓</p>
                  </div>
                </div>
                <div className="absolute -right-4 bottom-12 z-20 reveal delay-4">
                  <div className="rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl px-5 py-3 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    <p className="text-xs text-zinc-500">Overall Score</p>
                    <p className="text-xl font-bold font-mono text-white">7.2<span className="text-sm text-zinc-500">/10</span></p>
                  </div>
                </div>
              </div>

              {/* Glassmorphism frame with gradient glow border */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-b from-[#9b8ce8]/50 via-[#7ea3d4]/30 to-transparent shadow-[0_0_60px_rgba(139,92,246,0.1)]">
                <div className="rounded-[23px] bg-[#222224] p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="h-3 w-3 rounded-full bg-[#d47070]/60" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <div className="h-3 w-3 rounded-full bg-[#6ec88e]/60" />
                    <span className="ml-3 text-sm text-zinc-600">Kill My Idea — Full Analysis Report</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <div className="rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 p-4">
                        <p className="text-xs text-emerald-400 font-medium">Verdict</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">Pursue</p>
                        <p className="text-xs text-emerald-500/60 mt-1">Score: 7.2/10 · 72% confident</p>
                      </div>
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                        <p className="text-xs text-zinc-500 font-medium mb-2">Red Flags</p>
                        <div className="flex items-center gap-2 text-xs text-[#d47070]">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Crowded market — 12+ competitors</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                      <p className="text-xs text-zinc-500 font-medium mb-3">Dimension Scores</p>
                      <div className="space-y-2.5">
                        {[
                          { n: 'Demand', s: 78, c: 'bg-emerald-500' },
                          { n: 'Urgency', s: 65, c: 'bg-emerald-400' },
                          { n: 'Distribution', s: 52, c: 'bg-yellow-500' },
                          { n: 'Differentiation', s: 71, c: 'bg-[#7ea3d4]' },
                          { n: 'Competition', s: 41, c: 'bg-[#d47070]' },
                          { n: 'Monetization', s: 69, c: 'bg-violet-500' },
                          { n: 'Execution', s: 58, c: 'bg-orange-400' },
                        ].map((d) => (
                          <div key={d.n} className="flex items-center gap-2">
                            <span className="text-[11px] text-zinc-500 w-[85px] shrink-0">{d.n}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div className={`h-full rounded-full ${d.c}`} style={{ width: `${d.s}%` }} />
                            </div>
                            <span className="text-[11px] font-mono text-zinc-400 w-6 text-right">{(d.s/10).toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                        <p className="text-xs text-zinc-500 font-medium mb-2">Competitors</p>
                        <div className="space-y-2">
                          {['Otter.ai — $17/mo', 'Fireflies — $19/mo', 'Fathom — Free'].map((c) => (
                            <div key={c} className="flex items-center gap-2 text-xs text-zinc-400">
                              <div className="h-2 w-2 rounded-full bg-[#7ea3d4]" />
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#7ea3d4]/[0.08] border border-[#7ea3d4]/20 p-4">
                        <p className="text-xs text-[#7ea3d4] font-medium mb-2">Next Steps</p>
                        <div className="space-y-1.5 text-xs text-[#7ea3d4]/80">
                          <p>1. Validate with 20 target users</p>
                          <p>2. Build MVP for one use case</p>
                          <p>3. Test pricing with waitlist</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES ──────────────────────────────────────────────────── */}
        <section id="features" className="py-28 md:py-36 bg-[#1a1a1c] relative overflow-hidden">
          <div className="absolute bottom-0 left-1/3 h-[600px] w-[600px] rounded-full bg-[#7c6ce7]/[0.04] blur-[150px] pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="reveal text-center mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] px-4 py-1.5 text-xs font-medium text-zinc-400">
                <Star className="h-3 w-3" />
                Features
              </span>
            </div>
            <h2 className="reveal delay-1 text-center text-4xl md:text-5xl font-bold leading-tight max-w-xl mx-auto">
              Keep all the evidence
              <br /><span className="bg-gradient-to-r from-[#9b8ce8] via-[#b8a5f0] to-[#c4b5f5] bg-clip-text text-transparent">in one place</span>
            </h2>
            <p className="reveal delay-2 text-center mt-4 text-zinc-500 max-w-md mx-auto">
              Forget scattered research. Every data point organized and traceable.
            </p>

            <div className="mt-16 grid gap-6 md:grid-cols-2">
              {[
                {
                  icon: BarChart3, iconColor: 'text-[#7ea3d4]', title: '7-Dimension Scoring',
                  desc: 'Every idea scored across demand, urgency, distribution, differentiation, competition, monetization, and execution with transparent reasoning.',
                  mockup: [{ n: 'Demand', w: '82%', c: 'bg-emerald-500' }, { n: 'Distribution', w: '55%', c: 'bg-yellow-500' }, { n: 'Competition', w: '38%', c: 'bg-[#d47070]' }, { n: 'Monetization', w: '72%', c: 'bg-[#7ea3d4]' }],
                },
                {
                  icon: Search, iconColor: 'text-[#9b8ce8]', title: 'Real Competitor Intel',
                  desc: 'Actual competitor names with pricing, user counts, strengths and weaknesses. Not vague advice.',
                  competitors: [{ n: 'Otter.ai', p: '$16.99/mo', bg: 'bg-[#7ea3d4]' }, { n: 'Fireflies.ai', p: '$19/mo', bg: 'bg-[#9b8ce8]' }, { n: 'Fathom', p: 'Free', bg: 'bg-emerald-500' }],
                },
                {
                  icon: Shield, iconColor: 'text-[#d4a06b]', title: '7 Guardrail Overrides',
                  desc: 'Automatic logic overrides prevent false confidence. High score with weak distribution? Downgraded.',
                  guardrails: true,
                },
                {
                  icon: Target, iconColor: 'text-emerald-400', title: 'Actionable Next Steps',
                  desc: 'Every verdict comes with specific actions. Test plans, refinement suggestions, or salvage options.',
                  steps: [{ n: 'Interview 20 target users', t: 'validate', bg: 'bg-[#7ea3d4]/20 text-[#7ea3d4] border border-[#7ea3d4]/20' }, { n: 'Build landing page MVP', t: 'build', bg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' }, { n: 'Test pricing with waitlist', t: 'test', bg: 'bg-[#d4a06b]/20 text-[#d4a06b] border border-[#d4a06b]/20' }],
                },
              ].map((card, i) => (
                <div key={i} className={`reveal delay-${i + 1} group rounded-2xl bg-white/[0.05] border border-white/[0.08] overflow-hidden hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(139,92,246,0.15)] transition-all duration-300`}>
                  <div className="p-6 bg-gradient-to-br from-white/[0.02] to-transparent">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                        <span className="text-xs font-medium text-zinc-400">{card.title}</span>
                      </div>
                      {/* Render mockup based on card type */}
                      {'mockup' in card && card.mockup && (
                        <div className="space-y-2">
                          {card.mockup.map((d: { n: string; w: string; c: string }) => (
                            <div key={d.n} className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-500 w-20">{d.n}</span>
                              <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                <div className={`h-full rounded-full ${d.c}`} style={{ width: d.w }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {'competitors' in card && card.competitors && (
                        <div className="space-y-2.5">
                          {card.competitors.map((c: { n: string; p: string; bg: string }) => (
                            <div key={c.n} className="flex items-center gap-2.5">
                              <div className={`h-7 w-7 rounded-lg ${c.bg} flex items-center justify-center text-white text-[10px] font-bold`}>{c.n[0]}</div>
                              <span className="text-xs font-medium text-zinc-300 flex-1">{c.n}</span>
                              <span className="text-[10px] text-zinc-500">{c.p}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {'guardrails' in card && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 rounded-lg bg-[#d4a06b]/[0.08] border border-[#d4a06b]/20 px-3 py-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-[#d4a06b] shrink-0" />
                            <span className="text-[11px] text-[#d4a06b]/80">High score + unclear distribution → Refine</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg bg-[#d47070]/[0.08] border border-[#d47070]/20 px-3 py-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-[#d47070] shrink-0" />
                            <span className="text-[11px] text-[#d47070]/80">Zero demand evidence → Test First</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 px-3 py-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="text-[11px] text-emerald-300/80">Strong differentiation + demand → Upgraded</span>
                          </div>
                        </div>
                      )}
                      {'steps' in card && card.steps && (
                        <div className="space-y-2">
                          {card.steps.map((s: { n: string; t: string; bg: string }, si: number) => (
                            <div key={si} className="flex items-center gap-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                              <span className="text-xs font-bold text-zinc-600 w-4">{si+1}</span>
                              <span className="text-[11px] text-zinc-300 flex-1">{s.n}</span>
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${s.bg}`}>{s.t}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="px-6 pb-6">
                    <h3 className="text-lg font-bold text-white mt-1">{card.title}</h3>
                    <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── QUICK ROAST ───────────────────────────────────────────────── */}
        <section className="py-28 md:py-36 bg-[#1a1a1c] overflow-hidden relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-[#7c6ce7]/[0.03] blur-[150px] pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="relative grid gap-12 md:grid-cols-2 items-center">
              <div className="reveal">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-4 py-1.5 text-xs font-medium text-orange-400 mb-6">
                  <Zap className="h-3 w-3" />
                  Try it free — no signup
                </span>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight text-white">
                  Get roasted in
                  <br />
                  <span className="bg-gradient-to-r from-[#9b8ce8] via-[#b8a5f0] to-[#c4b5f5] bg-clip-text text-transparent font-light italic">5 seconds flat</span>
                </h2>
                <p className="mt-5 text-zinc-400 leading-relaxed max-w-md">
                  Paste your idea. Get a brutally honest first impression, your biggest flaw, and the one question you need to answer.
                </p>

                <div className="mt-8 space-y-4">
                  {[
                    { icon: Zap, text: 'Instant AI-powered feedback in seconds', color: 'text-[#d4a06b] bg-[#d4a06b]/10 border border-[#d4a06b]/20' },
                    { icon: AlertTriangle, text: 'Your biggest flaw — identified immediately', color: 'text-[#d47070] bg-[#d47070]/10 border border-[#d47070]/20' },
                    { icon: Brain, text: 'The one question you must answer next', color: 'text-[#7ea3d4] bg-[#7ea3d4]/10 border border-[#7ea3d4]/20' },
                    { icon: ArrowRight, text: 'Upgrade to full 7-dimension analysis anytime', color: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' },
                  ].map((f, i) => (
                    <div key={i} className={`reveal delay-${i + 1} flex items-center gap-3`}>
                      <div className={`h-9 w-9 rounded-xl ${f.color} flex items-center justify-center shrink-0`}>
                        <f.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-zinc-400">{f.text}</span>
                    </div>
                  ))}
                </div>

                <div className="reveal delay-5 mt-8 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {['bg-[#7ea3d4]', 'bg-[#9b8ce8]', 'bg-emerald-500', 'bg-orange-500'].map((c, i) => (
                      <div key={i} className={`h-8 w-8 rounded-full ${c} border-2 border-[#1a1a1c] flex items-center justify-center text-white text-[10px] font-bold`}>
                        {['A', 'K', 'S', 'R'][i]}
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-300">2,400+</span> ideas roasted this month
                  </div>
                </div>
              </div>

              <div className="reveal-scale relative">
                {/* Gradient glow behind the card */}
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#9b8ce8]/10 via-[#7ea3d4]/5 to-[#c4b5f5]/10 blur-2xl pointer-events-none" />
                {/* Gradient border wrapper */}
                <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-[#9b8ce8]/50 via-[#7ea3d4]/30 to-transparent">
                  <div className="rounded-[23px] bg-[#222224] p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-[#d47070] flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-base font-bold text-white">Quick Roast</p>
                        <p className="text-xs text-zinc-500">Brutally honest in 5 seconds</p>
                      </div>
                    </div>
                    <QuickRoastForm />
                    <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> 100% free</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> No signup</span>
                      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Instant result</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── PRICING ───────────────────────────────────────────────────── */}
        <section className="py-28 md:py-36 bg-[#1a1a1c] relative overflow-hidden">
          <div className="absolute top-0 left-1/4 h-[600px] w-[600px] rounded-full bg-cyan-600/[0.03] blur-[150px] pointer-events-none" />

          <div className="relative mx-auto max-w-5xl px-6">
            <div className="reveal text-center mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] px-4 py-1.5 text-xs font-medium text-zinc-400">Pricing</span>
            </div>
            <h2 className="reveal delay-1 text-center text-4xl md:text-5xl font-bold text-white">Simple pricing plans</h2>

            <div className="mt-14 grid gap-6 md:grid-cols-3 items-end">
              {/* Starter */}
              <div className="reveal delay-1 group rounded-2xl bg-white/[0.05] border border-white/[0.08] p-7 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] transition-all duration-300">
                <p className="text-lg font-bold text-white">Starter pack</p>
                <p className="text-xs text-zinc-500 mt-0.5">Perfect for trying it out</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">₹{CREDIT_PACKAGES[0].price_inr}</span>
                  <span className="text-sm text-zinc-500">/ {CREDIT_PACKAGES[0].credits} credits</span>
                </div>
                <Link href="/signup" className="block mt-6">
                  <Button variant="outline" className="w-full rounded-xl h-11 font-medium border-white/[0.1] bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08] hover:text-white">Get started</Button>
                </Link>
                <div className="mt-6 space-y-3">
                  {['Full 7-dimension analysis', 'Real competitor data', 'Evidence-backed verdict', 'Red & green flags', 'Actionable next steps', 'Share reports'].map((f) => (
                    <div key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-zinc-600 shrink-0" /><span className="text-sm text-zinc-400">{f}</span></div>
                  ))}
                </div>
              </div>

              {/* Pro — gradient background */}
              <div className="reveal delay-2 relative rounded-2xl bg-gradient-to-b from-[#7c6ce7] via-[#7c6ce7] to-[#6b5dd6] p-7 shadow-[0_0_50px_rgba(139,92,246,0.2)] text-white md:-mt-6 hover:shadow-[0_0_60px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-all duration-300">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#d4a06b] to-orange-500 flex items-center justify-center shadow-lg shadow-[#d4a06b]/30">
                    <Zap className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-lg font-bold">Pro pack</p>
                  <p className="text-xs text-blue-200/60 mt-0.5">Most popular for founders</p>
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">₹{CREDIT_PACKAGES[1].price_inr}</span>
                  <span className="text-sm text-blue-200/60">/ {CREDIT_PACKAGES[1].credits} credits</span>
                </div>
                <p className="text-xs text-blue-200/60 mt-1">Best value · ₹{Math.round(CREDIT_PACKAGES[1].price_inr / CREDIT_PACKAGES[1].credits)}/analysis</p>
                <Link href="/signup" className="block mt-6">
                  <Button className="w-full rounded-xl h-11 font-medium bg-white text-[#7ea3d4] hover:bg-[#7ea3d4]/10">Get started</Button>
                </Link>
                <div className="mt-6 space-y-3">
                  {['Everything in Starter', 'Compare ideas side-by-side', 'AI comparison takeaway', 'Priority signal collection', 'Guardrail override details', 'Unlimited share links'].map((f) => (
                    <div key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-blue-300/60 shrink-0" /><span className="text-sm text-blue-100/80">{f}</span></div>
                  ))}
                </div>
              </div>

              {/* Team */}
              <div className="reveal delay-3 group rounded-2xl bg-white/[0.05] border border-white/[0.08] p-7 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] transition-all duration-300">
                <p className="text-lg font-bold text-white">Team pack</p>
                <p className="text-xs text-zinc-500 mt-0.5">For serious idea pipelines</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">₹{CREDIT_PACKAGES[2].price_inr}</span>
                  <span className="text-sm text-zinc-500">/ {CREDIT_PACKAGES[2].credits} credits</span>
                </div>
                <Link href="/signup" className="block mt-6">
                  <Button className="w-full rounded-xl h-11 font-medium bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] hover:from-[#8b7cf0] hover:to-[#a99af0] text-white border-0">Get started</Button>
                </Link>
                <div className="mt-6 space-y-3">
                  {['Everything in Pro', 'Bulk analysis discount', 'Full evidence explorer', 'Export reports', 'Admin dashboard', 'Priority support'].map((f) => (
                    <div key={f} className="flex items-center gap-2.5"><CheckCircle2 className="h-4 w-4 text-zinc-600 shrink-0" /><span className="text-sm text-zinc-400">{f}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ────────────────────────────────────────────────────────── */}
        <section className="py-28 md:py-36 bg-[#1a1a1c] relative overflow-hidden">
          <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full bg-[#7c6ce7]/[0.03] blur-[150px] pointer-events-none" />

          <div className="relative mx-auto max-w-6xl px-6">
            <div className="grid gap-12 md:grid-cols-[1fr_1.5fr] items-start">
              <div className="reveal md:sticky md:top-32">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/[0.1] px-4 py-1.5 text-xs font-medium text-zinc-400 mb-6">
                  <Brain className="h-3 w-3" />
                  FAQ
                </span>
                <h2 className="text-3xl md:text-4xl font-bold leading-tight text-white">
                  Frequently asked
                  <br />questions
                </h2>
                <p className="mt-4 text-zinc-500 leading-relaxed">
                  Everything you need to know about Kill My Idea. Can&apos;t find what you&apos;re looking for?
                </p>
                <Link href="/signup" className="inline-flex items-center gap-2 mt-6 text-sm bg-gradient-to-r from-[#9b8ce8] to-[#b8a5f0] bg-clip-text text-transparent font-medium hover:from-[#b8a5f0] hover:to-[#c4b5f5] transition-all">
                  Get in touch <ArrowRight className="h-3.5 w-3.5 text-[#7ea3d4]" />
                </Link>
              </div>

              <div className="space-y-3">
                {faqs.map((faq, i) => (
                  <div key={i} className={cn(
                    'reveal rounded-2xl border overflow-hidden transition-all duration-300',
                    openFaq === i
                      ? 'border-[#9b8ce8]/30 bg-[#9b8ce8]/[0.05] shadow-[0_0_20px_rgba(139,92,246,0.08)]'
                      : 'border-white/[0.08] bg-white/[0.05] hover:border-white/[0.15]'
                  )} style={{ transitionDelay: `${i * 0.05}s` }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex w-full items-center justify-between px-6 py-5 text-left"
                    >
                      <span className="text-sm font-semibold text-zinc-200 pr-4">{faq.q}</span>
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                        openFaq === i ? 'bg-gradient-to-r from-[#9b8ce8] to-[#b8a5f0] text-white rotate-180' : 'bg-white/[0.06] text-zinc-500'
                      )}>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </button>
                    <div className={cn(
                      'grid transition-all duration-300',
                      openFaq === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    )}>
                      <div className="overflow-hidden">
                        <div className="px-6 pb-5 text-sm text-zinc-400 leading-relaxed">{faq.a}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── CTA ────────────────────────────────────────────────────────── */}
        <section className="py-28 md:py-36 bg-[#1a1a1c] relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-[#7c6ce7]/[0.05] blur-[150px] pointer-events-none" />

          <div className="relative mx-auto max-w-5xl px-6">
            <div className="reveal-scale relative">
              {/* Floating accent icons */}
              <div className="hidden md:block pointer-events-none">
                <div className="absolute -top-8 -left-6 h-16 w-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl shadow-[0_0_20px_rgba(139,92,246,0.1)] flex items-center justify-center rotate-[-8deg]">
                  <Zap className="h-7 w-7 text-[#d4a06b]" />
                </div>
                <div className="absolute -top-6 -right-4 h-14 w-14 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl shadow-[0_0_20px_rgba(59,130,246,0.1)] flex items-center justify-center rotate-[6deg]">
                  <Target className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="absolute -bottom-6 left-16 h-12 w-12 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.1)] flex items-center justify-center rotate-[10deg]">
                  <BarChart3 className="h-5 w-5 text-[#7ea3d4]" />
                </div>
                <div className="absolute -bottom-4 right-20 h-14 w-14 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-xl shadow-[0_0_20px_rgba(139,92,246,0.1)] flex items-center justify-center rotate-[-5deg]">
                  <Shield className="h-6 w-6 text-[#9b8ce8]" />
                </div>
              </div>

              {/* Gradient glow border card */}
              <div className="rounded-3xl p-[1px] bg-gradient-to-b from-[#9b8ce8]/50 via-[#7ea3d4]/30 to-transparent shadow-[0_0_60px_rgba(139,92,246,0.1)]">
                <div className="rounded-[23px] bg-[#222224] overflow-hidden">
                  <div className="h-[2px] bg-gradient-to-r from-[#9b8ce8] via-[#7ea3d4] to-[#c4b5f5]" />
                  <div className="px-8 py-16 md:px-16 md:py-20 text-center">
                    <div className="flex items-center justify-center gap-3 mb-8">
                      <div className="h-12 w-12 rounded-2xl bg-[#7ea3d4]/10 border border-[#7ea3d4]/20 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-[#7ea3d4]" />
                      </div>
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#7c6ce7] to-[#9b8ce8] flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                        <Zap className="h-7 w-7 text-white" />
                      </div>
                      <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      </div>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-bold leading-tight text-white">
                      Stop guessing.
                      <br />
                      <span className="bg-gradient-to-r from-[#9b8ce8] via-[#b8a5f0] to-[#c4b5f5] bg-clip-text text-transparent font-light italic">Start validating today.</span>
                    </h2>

                    <p className="mt-5 text-zinc-400 text-lg max-w-lg mx-auto leading-relaxed">
                      Join founders who validate before they build. 3 free analyses on signup. No credit card. No commitment.
                    </p>

                    <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link href="/signup">
                        <Button size="lg" className="group rounded-xl px-10 h-13 text-base bg-white text-[#1a1a1c] hover:bg-zinc-100 shadow-lg shadow-white/10 transition-all hover:-translate-y-0.5 border-0">
                          Get started free <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Button>
                      </Link>
                      <Link href="/pricing">
                        <Button size="lg" variant="outline" className="rounded-xl px-8 h-13 text-base border-white/[0.1] bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08] hover:text-white">
                          View pricing
                        </Button>
                      </Link>
                    </div>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> No credit card required</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 3 free analyses</span>
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Cancel anytime</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function HeroHeader() {
  const [menuState, setMenuState] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const { user, signOut } = useAuth();

  React.useEffect(() => { setMounted(true); }, []);

  // Until mounted, render the logged-out version (matches SSR)
  const isLoggedIn = mounted && !!user;

  const menuItems = isLoggedIn
    ? [{ name: 'Dashboard', href: '/dashboard' }, { name: 'My Ideas', href: '/ideas/new' }, { name: 'Pricing', href: '/pricing' }]
    : [{ name: 'Features', href: '#features' }, { name: 'Pricing', href: '/pricing' }];

  return (
    <header className="fixed top-0 z-50 w-full bg-[#1a1a1c]/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6ce7] to-[#9b8ce8] shadow-lg shadow-[#9b8ce8]/15">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">Kill My Idea</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {menuItems.map((item, i) => (
            <Link key={i} href={item.href} className="text-sm text-zinc-400 hover:text-white transition-colors">{item.name}</Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href="/dashboard"><Button variant="ghost" size="sm" className="gap-2 text-zinc-400 hover:text-white hover:bg-white/[0.06]"><LayoutDashboard className="h-3.5 w-3.5" /> Dashboard</Button></Link>
              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white hover:bg-white/[0.06]" onClick={signOut}><LogOut className="h-3.5 w-3.5 mr-1" /> Sign Out</Button>
            </>
          ) : (
            <>
              <Link href="/signin"><Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/[0.06]">Sign in</Button></Link>
              <Link href="/signup"><Button size="sm" className="rounded-lg bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] text-white hover:from-[#8b7cf0] hover:to-[#a99af0] border-0 shadow-lg shadow-[#9b8ce8]/15">Get started</Button></Link>
            </>
          )}
        </div>
        <button onClick={() => setMenuState(!menuState)} className="md:hidden p-2 text-zinc-400">
          {menuState ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {menuState && (
        <div className="md:hidden bg-[#222224]/95 backdrop-blur-xl border-t border-white/[0.06] px-6 py-4 space-y-3">
          {menuItems.map((item, i) => (
            <Link key={i} href={item.href} className="block text-sm text-zinc-400 py-1 hover:text-white transition-colors" onClick={() => setMenuState(false)}>{item.name}</Link>
          ))}
          <div className="pt-2 border-t border-white/[0.06] flex gap-2">
            {isLoggedIn ? (
              <Link href="/dashboard" className="flex-1"><Button variant="outline" size="sm" className="w-full border-white/[0.1] text-zinc-300 hover:bg-white/[0.06]">Dashboard</Button></Link>
            ) : (
              <>
                <Link href="/signin" className="flex-1"><Button variant="outline" size="sm" className="w-full border-white/[0.1] text-zinc-300 hover:bg-white/[0.06]">Sign in</Button></Link>
                <Link href="/signup" className="flex-1"><Button size="sm" className="w-full bg-gradient-to-r from-[#7c6ce7] to-[#9b8ce8] text-white border-0">Get started</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
