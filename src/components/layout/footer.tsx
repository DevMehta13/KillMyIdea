import Link from 'next/link';
import { Zap, BarChart3, Target, Shield, Brain, Search, FileCheck, Clock, CheckCircle2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#1a1a1c] border-t border-white/[0.06]">
      <div className="mx-auto max-w-6xl px-6">
        {/* Top section */}
        <div className="py-16 grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7c6ce7]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white">Kill My Idea</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold leading-tight max-w-xs text-white">
              Stay validated and
              <br />boost your decisions
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><Link href="/pricing" className="hover:text-white transition-colors flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-zinc-600" />Pricing</Link></li>
                <li><Link href="/signup" className="hover:text-white transition-colors flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-zinc-600" />Get Started</Link></li>
                <li><Link href="/signin" className="hover:text-white transition-colors flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-zinc-600" />Sign In</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-zinc-600" />Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <ul className="space-y-3 text-sm text-zinc-500">
                <li><span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-zinc-600" />Features</span></li>
                <li><span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-zinc-600" />Analysis</span></li>
                <li><span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-zinc-600" />Compare</span></li>
                <li><span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-zinc-600" />API</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Icon row */}
        <div className="py-10 flex flex-wrap items-center justify-center gap-5 md:gap-8">
          {[
            { icon: BarChart3, color: 'text-[#7ea3d4]', shadow: 'shadow-[#7ea3d4]/10' },
            { icon: Target, color: 'text-[#6ec88e]', shadow: 'shadow-[#6ec88e]/10' },
            { icon: Shield, color: 'text-[#d4a06b]', shadow: 'shadow-[#d4a06b]/10' },
            { icon: Brain, color: 'text-[#9b8ce8]', shadow: 'shadow-[#9b8ce8]/10' },
            { icon: Search, color: 'text-[#7ec4d4]', shadow: 'shadow-[#7ec4d4]/10' },
            { icon: FileCheck, color: 'text-[#6ec88e]', shadow: 'shadow-[#6ec88e]/10' },
            { icon: Clock, color: 'text-[#d4a06b]', shadow: 'shadow-[#d4a06b]/10' },
            { icon: CheckCircle2, color: 'text-[#7ea3d4]', shadow: 'shadow-[#7ea3d4]/10' },
          ].map((item, i) => (
            <div
              key={i}
              className={`h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-lg ${item.shadow} hover:scale-105 transition-transform duration-300`}
              style={{ transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (3 + i)}deg)` }}
            >
              <item.icon className={`h-6 w-6 md:h-7 md:w-7 ${item.color}`} />
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.06] py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} Kill My Idea. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <span className="hover:text-zinc-400 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-zinc-400 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
