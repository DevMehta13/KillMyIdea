import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-dark relative flex min-h-screen flex-col items-center justify-center bg-[#1a1a1c] px-4 py-12">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 pointer-events-none dark-grid" />

      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-[#7c6ce7]/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 h-[300px] w-[300px] rounded-full bg-[#7ea3d4]/8 blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#7c6ce7] to-[#9b8ce8] shadow-lg shadow-[#9b8ce8]/15">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">Kill My Idea</span>
        </Link>

        <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-xl shadow-black/20 backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
