"use client";

import { motion, AnimatePresence } from "framer-motion";
import { EXAMPLES } from "@/lib/actions-data";

interface Props {
  onSelect: (prompt: string) => void;
}

export default function ExampleChips({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((ex, i) => (
        <motion.button
          key={ex.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(ex.prompt)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white hover:border-violet-500/40 hover:bg-violet-500/10 transition-all duration-200 cursor-pointer"
        >
          <span>{ex.emoji}</span>
          <span>{ex.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
