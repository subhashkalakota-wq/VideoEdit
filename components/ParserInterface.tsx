"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Trash2, Clock, ChevronRight, Film } from "lucide-react";
import toast from "react-hot-toast";
import type { ParseResult } from "@/lib/types";
import { useParseHistory } from "@/hooks/useParseHistory";
import { useVideoContext } from "@/hooks/useVideoContext";
import ExampleChips from "./ExampleChips";
import JsonViewer from "./JsonViewer";
import HistoryPanel from "./HistoryPanel";

const PLACEHOLDER = `e.g. Cut the first 10 seconds, add slow motion in the middle, apply cinematic color grading, and overlay a title "Welcome" at the intro...

Or try: "Make this video go viral"`;

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function ParserInterface() {
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { add: addToHistory } = useParseHistory();
  const { video } = useVideoContext();

  const handleParse = useCallback(async (text?: string) => {
    const input = (text ?? instruction).trim();
    if (!input) {
      toast.error("Please enter a video editing instruction.");
      textareaRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: input,
          ...(video ? { videoDuration: video.duration } : {}),
        }),
      });
      const data: ParseResult = await res.json();
      setResult(data);
      if (!data.error) {
        addToHistory(input, data);
      }
    } catch {
      toast.error("Failed to connect to the parser API.");
    } finally {
      setLoading(false);
    }
  }, [instruction, addToHistory, video]);

  const handleSelect = (prompt: string) => {
    setInstruction(prompt);
    handleParse(prompt);
    textareaRef.current?.focus();
  };

  const handleRestore = (instr: string) => {
    setInstruction(instr);
    setHistoryOpen(false);
    handleParse(instr);
  };

  const handleClear = () => {
    setInstruction("");
    setResult(null);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleParse();
    }
  };

  return (
    <section id="parser" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="badge mb-4">{video ? "Step 2 — Command" : "Live Parser"}</div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">
            {video ? "Describe Your Edits" : "Try It Now"}
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            {video
              ? "Type editing instructions below — the parser uses your video's actual duration."
              : "Type any video editing instruction and get structured JSON instantly."}
          </p>
        </motion.div>

        {/* Video context pill */}
        <AnimatePresence>
          {video && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-center mb-6"
            >
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass border border-violet-500/30 bg-violet-500/8">
                <Film size={13} className="text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">
                  {video.name}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400">
                  Duration: <span className="text-white font-mono font-semibold">{formatDuration(video.duration)}</span>
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-xs text-slate-400">
                  <span className="text-emerald-400 font-semibold">Real timestamps</span> will be used
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick examples */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-wrap items-center gap-3"
        >
          <span className="text-xs text-slate-500 font-medium uppercase tracking-widest whitespace-nowrap">
            Quick examples:
          </span>
          <ExampleChips onSelect={handleSelect} />
        </motion.div>

        {/* Main layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="grid lg:grid-cols-2 gap-5"
        >
          {/* ── Left: Input Panel ── */}
          <div className="glass rounded-2xl border border-white/[0.08] flex flex-col overflow-hidden focus-within:border-violet-500/40 transition-colors duration-200 min-h-[480px]">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa]" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Your Instruction
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistoryOpen(!historyOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    historyOpen
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "glass border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  <Clock size={12} />
                  History
                </button>
                {instruction && (
                  <button
                    onClick={handleClear}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Clear"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Textarea or History */}
            <div className="flex-1 flex flex-col">
              <AnimatePresence mode="wait">
                {historyOpen ? (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex-1 overflow-hidden"
                  >
                    <HistoryPanel onRestore={handleRestore} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="textarea"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col"
                  >
                    <textarea
                      ref={textareaRef}
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        video
                          ? `Your video is ${formatDuration(video.duration)} long.\n\ne.g. "Cut the first 10 seconds and add cinematic color grading"\n"Add slow motion from 0:30 to 1:00"\n"Make it go viral"`
                          : PLACEHOLDER
                      }
                      className="parser-textarea flex-1 p-5 min-h-[280px]"
                      spellCheck={false}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.06] bg-white/[0.02] shrink-0">
              <span className="text-xs text-slate-600">
                {instruction.length} chars
                <span className="mx-1.5 text-slate-700">·</span>
                <span className="text-slate-700">⌘↵ to parse</span>
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleParse()}
                disabled={loading || !instruction.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Zap size={14} fill="white" />
                    Parse Command
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* ── Right: Output Panel ── */}
          <div className="glass rounded-2xl border border-white/[0.08] flex flex-col overflow-hidden min-h-[480px]">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  JSON Output
                </span>
              </div>
              {result?.actions.length ? (
                <span className="text-xs font-mono text-violet-400 font-semibold">
                  {result.actions.length} action{result.actions.length !== 1 ? "s" : ""}
                </span>
              ) : null}
            </div>

            {/* Output body */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full gap-5 py-20"
                  >
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                      <div className="absolute inset-0 rounded-full border-t-2 border-violet-400 animate-spin" />
                      <div className="absolute inset-2 rounded-full border-t-2 border-cyan-400 animate-spin"
                        style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-slate-300 font-medium">Parsing instruction...</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {video ? `Using duration: ${formatDuration(video.duration)}` : "Analyzing context & mapping actions"}
                      </p>
                    </div>
                  </motion.div>
                ) : result ? (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                    <JsonViewer result={result} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full gap-4 py-20 text-center px-8"
                  >
                    <div className="w-16 h-16 rounded-2xl glass border border-white/[0.08] flex items-center justify-center text-xl font-mono text-slate-600">
                      {"{ }"}
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 font-medium">Structured JSON will appear here</p>
                      <p className="text-xs text-slate-600 mt-1">
                        {video
                          ? "Your video is ready — type a command above"
                          : <>Type an instruction and click <span className="text-violet-400">Parse Command</span></>}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full max-w-xs text-left">
                      {["trim_video → start, end", "apply_filter → filter_name", "add_subtitles → language"].map((hint) => (
                        <div key={hint} className="flex items-center gap-2 text-xs text-slate-700">
                          <ChevronRight size={10} className="text-violet-600 shrink-0" />
                          <span className="font-mono">{hint}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
