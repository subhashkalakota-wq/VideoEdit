"use client";

import { Zap } from "lucide-react";

const REF_TABLE = [
  { term: '"intro"',        result: 'First 5 seconds' },
  { term: '"outro"',        result: 'Last 5 seconds' },
  { term: '"middle"',       result: 'Video midpoint ±5s' },
  { term: '"slow motion"',  result: 'Speed factor 0.5×' },
  { term: '"make it fast"', result: 'Speed factor 1.5×' },
  { term: '"cinematic"',    result: 'Filter + Zoom + Color' },
  { term: '"vlog style"',   result: 'Cuts + Subs + Music' },
  { term: '"viral"',        result: 'Highlights + Captions + Speed' },
];

export default function Footer() {
  return (
    <>
      {/* Quick Reference */}
      <section className="py-20 px-6 bg-white/40 border-t border-black/[0.05]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="badge mb-4">Quick Reference</div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-3 text-slate-900">Shorthand Interpretations</h2>
            <p className="text-slate-500">These keywords are understood automatically by the parser.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {REF_TABLE.map((row) => (
              <div key={row.term}
                className="bg-white rounded-xl p-4 border border-black/[0.07] shadow-sm hover:border-violet-300 hover:shadow-violet-500/8 hover:-translate-y-0.5 transition-all group cursor-default">
                <p className="font-mono text-sm text-violet-600 font-semibold mb-1 group-hover:text-violet-700">{row.term}</p>
                <p className="text-xs text-slate-500">→ {row.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] py-10 px-6 bg-white/60">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Zap size={15} className="text-white" fill="white" />
            </div>
            <span className="font-bold text-base text-slate-900">VideoAI <span className="text-violet-600">Parser</span></span>
          </div>
          <p className="text-xs text-slate-400">Built for developers who speak human. © 2026 VideoAI Parser.</p>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Next.js 16</span><span>·</span><span>TypeScript</span><span>·</span><span>FFmpeg 8.0</span>
          </div>
        </div>
      </footer>
    </>
  );
}
