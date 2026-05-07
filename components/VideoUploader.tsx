"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Film, X, AlertCircle } from "lucide-react";
import { useVideoContext, type VideoInfo } from "@/hooks/useVideoContext";

const ACCEPTED = ["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-msvideo", "video/avi"];
const MAX_SIZE_MB = 500;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function analyzeVideo(file: File): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.src = url;

    vid.onloadedmetadata = () => {
      resolve({
        name: file.name,
        size: file.size,
        type: file.type,
        duration: vid.duration,
        width: vid.videoWidth,
        height: vid.videoHeight,
        objectUrl: url,
        uploadedAt: Date.now(),
      });
    };

    vid.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata. Please try another file."));
    };
  });
}

export default function VideoUploader() {
  const { setVideo } = useVideoContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const processFile = useCallback(async (file: File) => {
    setError(null);

    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi|mkv|ogg)$/i)) {
      setError("Unsupported file type. Please upload MP4, WebM, MOV, AVI, or MKV.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setAnalyzing(true);
    setProgress(10);

    // Fake progress for UX
    const tick = setInterval(() => setProgress((p) => Math.min(p + 15, 85)), 200);

    try {
      const info = await analyzeVideo(file);
      clearInterval(tick);
      setProgress(100);
      await new Promise((r) => setTimeout(r, 300));
      setVideo(info);
    } catch (err) {
      clearInterval(tick);
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setAnalyzing(false);
      setProgress(0);
    }
  }, [setVideo]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  }, [processFile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden
          ${dragging
            ? "border-violet-400 bg-violet-500/10 scale-[1.01]"
            : "border-white/15 bg-white/[0.03] hover:border-violet-500/50 hover:bg-white/[0.05]"
          }`}
      >
        {/* Background glow when dragging */}
        <AnimatePresence>
          {dragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-500/10 pointer-events-none"
            />
          )}
        </AnimatePresence>

        <div className="flex flex-col items-center justify-center gap-5 py-16 px-8 text-center relative z-10">
          {analyzing ? (
            // Analyzing state
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4 w-full"
            >
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                <div className="absolute inset-0 rounded-full border-t-2 border-violet-400 animate-spin" />
                <div className="absolute inset-2 rounded-full border-t-2 border-cyan-400 animate-spin"
                  style={{ animationDirection: "reverse", animationDuration: "0.9s" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Film size={18} className="text-violet-300" />
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">Analyzing video...</p>
                <p className="text-xs text-slate-500">Reading metadata & duration</p>
              </div>
              {/* Progress bar */}
              <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          ) : (
            // Default upload state
            <>
              <motion.div
                animate={dragging ? { scale: 1.15, rotate: 5 } : { scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/30 flex items-center justify-center"
              >
                <Upload size={32} className="text-violet-300" />
              </motion.div>

              <div>
                <p className="text-lg font-bold text-white mb-1.5">
                  {dragging ? "Drop your video here" : "Upload your video"}
                </p>
                <p className="text-sm text-slate-400 mb-1">
                  Drag & drop or <span className="text-violet-400 font-semibold">click to browse</span>
                </p>
                <p className="text-xs text-slate-600">
                  MP4, WebM, MOV, AVI, MKV &nbsp;·&nbsp; Max {MAX_SIZE_MB} MB
                </p>
              </div>

              {/* Supported formats */}
              <div className="flex flex-wrap gap-2 justify-center">
                {["MP4", "WebM", "MOV", "AVI", "MKV"].map((fmt) => (
                  <span key={fmt} className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-white/[0.05] border border-white/[0.08] text-slate-400">
                    {fmt}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm"
          >
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={onFileChange}
      />
    </motion.div>
  );
}
