"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30">
          <Zap size={28} className="text-white" fill="white" />
        </div>

        <p className="text-8xl font-black text-white/5 font-mono mb-2">404</p>
        <h1 className="text-2xl font-bold text-white mb-3 -mt-4">Page Not Found</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          This route doesn&apos;t exist. Head back to the parser and keep creating.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 text-white font-semibold text-sm shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5 transition-all duration-200"
        >
          <ArrowLeft size={15} />
          Back to Parser
        </Link>
      </motion.div>
    </div>
  );
}
