"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useParseHistory } from "@/hooks/useParseHistory";
import { Trash2, Clock, ChevronRight, RotateCcw } from "lucide-react";
import { formatTimestamp, avgConfidence } from "@/lib/utils";

interface Props {
  onRestore: (instruction: string) => void;
}

export default function HistoryPanel({ onRestore }: Props) {
  const { items, remove, clear } = useParseHistory();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-600 gap-3">
        <Clock size={32} className="opacity-40" />
        <p className="text-sm">No parse history yet.</p>
        <p className="text-xs">Your previous commands will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          History ({items.length})
        </span>
        <button
          onClick={clear}
          className="text-xs text-slate-600 hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          <Trash2 size={11} />
          Clear
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const avg = avgConfidence(item.result.actions);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ duration: 0.2 }}
                className="group relative rounded-xl p-3 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-all cursor-pointer"
                onClick={() => onRestore(item.instruction)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 font-medium leading-snug truncate">
                      {item.instruction}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-slate-600">
                        {formatTimestamp(item.timestamp)}
                      </span>
                      <span className="text-[10px] text-slate-600">·</span>
                      <span className="text-[10px] text-violet-400 font-medium">
                        {item.result.actions.length} action{item.result.actions.length !== 1 ? "s" : ""}
                      </span>
                      {avg > 0 && (
                        <>
                          <span className="text-[10px] text-slate-600">·</span>
                          <span className="text-[10px] text-emerald-400 font-medium">
                            {Math.round(avg * 100)}% conf
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onRestore(item.instruction); }}
                      className="p-1 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                      title="Restore"
                    >
                      <RotateCcw size={12} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
