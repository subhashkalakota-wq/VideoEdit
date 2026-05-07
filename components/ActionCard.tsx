"use client";

import { motion } from "framer-motion";
import type { ParsedAction } from "@/lib/types";
import { getActionMeta } from "@/lib/actions-data";

interface Props {
  action: ParsedAction;
  index: number;
}

export default function ActionCard({ action, index }: Props) {
  const meta = getActionMeta(action.action);
  const pct = Math.round(action.confidence * 100);

  const confColor =
    pct >= 90 ? "#10b981" : pct >= 75 ? "#06b6d4" : pct >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="glass rounded-xl p-4 border border-white/[0.07] hover:border-white/[0.15] transition-all duration-200 group cursor-default"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta?.icon ?? "⚙️"}</span>
          <span className="font-mono text-xs font-semibold text-violet-300">
            {action.action}
          </span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ color: confColor, background: `${confColor}15`, border: `1px solid ${confColor}40` }}
        >
          {pct}%
        </span>
      </div>

      {/* Description */}
      {meta && (
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">{meta.description}</p>
      )}

      {/* Confidence bar */}
      <div className="conf-bar-track">
        <motion.div
          className="conf-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay: 0.1 + index * 0.06 }}
          style={{ background: `linear-gradient(90deg, ${confColor}80, ${confColor})` }}
        />
      </div>

      {/* Parameters preview */}
      {Object.keys(action.parameters).length > 0 && (
        <div className="mt-3 text-xs font-mono text-slate-500 bg-black/20 rounded-lg p-2 leading-relaxed">
          {Object.entries(action.parameters)
            .slice(0, 3)
            .map(([k, v]) => (
              <div key={k}>
                <span className="text-violet-400">{k}</span>
                <span className="text-slate-600">: </span>
                <span className="text-emerald-400">
                  {typeof v === "object" ? "{...}" : String(v)}
                </span>
              </div>
            ))}
          {Object.keys(action.parameters).length > 3 && (
            <div className="text-slate-600 mt-0.5">
              +{Object.keys(action.parameters).length - 3} more...
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
