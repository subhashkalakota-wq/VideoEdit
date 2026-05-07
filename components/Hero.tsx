"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

const PREVIEWS = [
  {
    prompt: "make it cinematic",
    actions: [
      { action: "apply_filter",    color: "#7c3aed" },
      { action: "zoom",            color: "#2563eb" },
      { action: "color_correction",color: "#059669" },
    ],
  },
  {
    prompt: "make this video go viral",
    actions: [
      { action: "auto_highlights", color: "#db2777" },
      { action: "add_subtitles",   color: "#0ea5e9" },
      { action: "change_speed",    color: "#7c3aed" },
      { action: "add_music",       color: "#d97706" },
    ],
  },
  {
    prompt: "add slow motion in the middle",
    actions: [
      { action: "change_speed", color: "#2563eb" },
    ],
  },
];

const STATS = [
  { num: "25+",  label: "Actions" },
  { num: "<1ms", label: "Parse Speed" },
  { num: "Real", label: "FFmpeg Output" },
  { num: "0",    label: "Setup Needed" },
];

function LivePreviewCard() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % PREVIEWS.length); setVisible(true); }, 350);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const ex = PREVIEWS[idx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.6 }}
      className="mx-auto max-w-xl mt-14 rounded-2xl border border-black/[0.07] bg-white shadow-xl shadow-violet-500/8 overflow-hidden"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.06] bg-slate-50/80">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-amber-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="flex-1 mx-3 h-5 rounded-md bg-slate-100 flex items-center px-3">
          <span className="text-[10px] text-slate-400 font-mono">POST /api/process</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-emerald-600 font-semibold">live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-black/[0.05]">
        <div className="p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">Instruction</p>
          <AnimatePresence mode="wait">
            {visible && (
              <motion.p key={ex.prompt} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="text-xs text-slate-700 font-medium leading-relaxed">
                &ldquo;{ex.prompt}&rdquo;
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">Operations</p>
          <AnimatePresence mode="wait">
            {visible && (
              <motion.div key={ex.prompt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
                {ex.actions.map((a, i) => (
                  <motion.div key={a.action} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="font-mono text-[10px] font-semibold" style={{ color: a.color }}>{a.action}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-4 py-2.5 border-t border-black/[0.05] bg-slate-50 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-mono">{ex.actions.length} op{ex.actions.length !== 1 ? "s" : ""} · FFmpeg · &lt;2s</span>
        <div className="flex gap-1">
          {PREVIEWS.map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full transition-all duration-300"
              style={{ background: i === idx ? "#7c3aed" : "rgba(0,0,0,0.15)" }} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center overflow-hidden">
      <div className="max-w-4xl mx-auto w-full">
        {/* Badge */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold tracking-widest uppercase mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          AI-Powered · Real FFmpeg · 25+ Actions
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-slate-900">
          Turn Words Into<br />
          <span className="gradient-text">Video Edit Commands</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
          className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your video, describe any edit in plain English — our backend runs real FFmpeg and returns the processed video instantly.
        </motion.p>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 mb-14">
          <Link href="/editor"
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold text-base shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-1 transition-all duration-200">
            <Zap size={17} fill="white" /> Start Editing
          </Link>
          <a href="#how-it-works"
            className="flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white border border-black/[0.08] text-slate-700 font-semibold text-base shadow-sm hover:border-violet-300 hover:text-violet-700 hover:shadow-violet-500/10 transition-all duration-200">
            Learn More <ArrowRight size={16} />
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
          className="flex flex-wrap items-center justify-center gap-10 mb-2">
          {STATS.map(stat => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-slate-900">{stat.num}</span>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">{stat.label}</span>
            </div>
          ))}
        </motion.div>

        <LivePreviewCard />
      </div>

      {/* Scroll hint */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-slate-400">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
          <ChevronDown size={15} />
        </motion.div>
      </motion.div>
    </section>
  );
}
