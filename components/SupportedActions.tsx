"use client";

import { motion } from "framer-motion";
import { ACTION_METADATA, CATEGORY_LABELS } from "@/lib/actions-data";
import type { ActionCategory } from "@/lib/types";

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  timeline:  "from-violet-500/15 to-violet-500/5 border-violet-500/25 text-violet-300 hover:border-violet-500/50",
  text:      "from-emerald-500/15 to-emerald-500/5 border-emerald-500/25 text-emerald-300 hover:border-emerald-500/50",
  audio:     "from-pink-500/15 to-pink-500/5 border-pink-500/25 text-pink-300 hover:border-pink-500/50",
  motion:    "from-blue-500/15 to-blue-500/5 border-blue-500/25 text-blue-300 hover:border-blue-500/50",
  visual:    "from-cyan-500/15 to-cyan-500/5 border-cyan-500/25 text-cyan-300 hover:border-cyan-500/50",
  effects:   "from-amber-500/15 to-amber-500/5 border-amber-500/25 text-amber-300 hover:border-amber-500/50",
  transform: "from-indigo-500/15 to-indigo-500/5 border-indigo-500/25 text-indigo-300 hover:border-indigo-500/50",
  analysis:  "from-rose-500/15 to-rose-500/5 border-rose-500/25 text-rose-300 hover:border-rose-500/50",
};

const CATEGORIES: ActionCategory[] = [
  "timeline","text","audio","motion","visual","effects","transform","analysis",
];

export default function SupportedActions() {
  return (
    <section
      id="actions"
      className="py-28 px-6 border-y border-white/[0.05] bg-white/[0.01]"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="badge mb-4">Capabilities</div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4">
            25+ Editing Actions Supported
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            From basic cuts to advanced AI effects — all mapped from plain English.
          </p>
        </motion.div>

        {/* Actions by category */}
        {CATEGORIES.map((cat, ci) => {
          const actions = ACTION_METADATA.filter((a) => a.category === cat);
          if (!actions.length) return null;
          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: ci * 0.06 }}
              className="mb-8"
            >
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 ml-1">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {actions.map((action, ai) => (
                  <motion.div
                    key={action.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.25, delay: ci * 0.04 + ai * 0.03 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r border text-xs font-mono font-medium cursor-default transition-all duration-200 ${CATEGORY_COLORS[cat]}`}
                  >
                    <span>{action.icon}</span>
                    <span>{action.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
