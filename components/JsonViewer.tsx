"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Download, TreeDeciduous, Code } from "lucide-react";
import type { ParseResult } from "@/lib/types";
import { avgConfidence } from "@/lib/utils";
import ActionCard from "./ActionCard";
import toast from "react-hot-toast";

interface Props {
  result: ParseResult;
}

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "json-number";
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? "json-key" : "json-string";
        } else if (/true|false/.test(match)) {
          cls = "json-boolean";
        } else if (/null/.test(match)) {
          cls = "json-null";
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

export default function JsonViewer({ result }: Props) {
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<"json" | "cards">("json");

  const jsonStr = JSON.stringify(result, null, 2);
  const avg = avgConfidence(result.actions);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    toast.success("JSON copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `videoai_actions_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        {/* View toggle */}
        <div className="flex items-center gap-1 glass rounded-lg p-0.5">
          <button
            onClick={() => setView("json")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              view === "json"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Code size={12} />
            Raw JSON
          </button>
          <button
            onClick={() => setView("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              view === "cards"
                ? "bg-white/10 text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <TreeDeciduous size={12} />
            Visual
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white hover:border-white/20 transition-all"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white hover:border-white/20 transition-all"
          >
            <Download size={12} />
            Save
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {result.actions.length > 0 && (
        <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-4 text-xs shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_#a78bfa]" />
            <span className="text-slate-400">{result.actions.length} actions</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-400">
              avg confidence: <span className="text-emerald-400 font-semibold">{Math.round(avg * 100)}%</span>
            </span>
          </span>
          {result.processingMs !== undefined && (
            <span className="text-slate-600">
              {result.processingMs}ms
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {result.error && (
        <div className="mx-4 my-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
          ⚠️ {result.error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {view === "json" ? (
          <motion.div
            key="json"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="code-block p-4 text-slate-300 min-h-full"
            dangerouslySetInnerHTML={{ __html: syntaxHighlight(jsonStr) }}
          />
        ) : (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 grid grid-cols-1 gap-3"
          >
            {result.actions.length === 0 ? (
              <p className="text-slate-600 text-sm text-center py-8">No actions to display.</p>
            ) : (
              result.actions.map((action, i) => (
                <ActionCard key={i} action={action} index={i} />
              ))
            )}
          </motion.div>
        )}
      </div>

      {/* Confidence bar */}
      {result.actions.length > 0 && (
        <div className="px-4 py-3 border-t border-white/[0.04] shrink-0">
          <div className="conf-bar-track">
            <motion.div
              className="conf-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(avg * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
