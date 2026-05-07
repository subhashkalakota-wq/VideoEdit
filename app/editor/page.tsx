"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Zap, ArrowLeft, Upload, Film, Play, Pause, RotateCcw,
  Volume2, VolumeX, Download, AlertCircle, CheckCircle2,
  Sparkles, Clock, Monitor, HardDrive, X, ChevronRight, History, Wand2,
} from "lucide-react";

interface VideoInfo { fileId: string; storedAs: string; fileName: string; size: number; duration: number; objectUrl: string; width: number; height: number; }
interface Result { outputId: string; outputFile: string; actions: { action: string }[]; }
interface HistoryItem { id: string; instruction: string; outputFile: string; actions: { action: string }[]; timestamp: number; version: number; }

const fmt = (b: number) => b < 1e6 ? `${(b/1024).toFixed(0)}KB` : `${(b/1e6).toFixed(1)}MB`;
const dur = (s: number) => { const m = Math.floor(s/60), sc = Math.floor(s%60); return `${m}:${String(sc).padStart(2,"0")}`; };

const CMDS = [
  "Make it cinematic", "Add slow motion in the middle", "Cut first 10 seconds",
  "Go viral", "Vintage filter", "Reverse video", "Remove audio",
  "Add text 'Subscribe' at the outro", "Zoom in slowly", "Stabilize video",
];

export default function EditorPage() {
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  // Tracks which file the NEXT edit will be applied to
  const [activeSource, setActiveSource] = useState<{ type: 'upload'; storedAs: string } | { type: 'output'; outputFile: string; version: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLVideoElement>(null);
  const editVersionRef = useRef(0);

  // ── AI Rewrite ────────────────────────────────────────
  const [rewriting, setRewriting] = useState(false);
  const [rewriteMethod, setRewriteMethod] = useState<'gemini'|'smart'|null>(null);
  const [showRewriteDiff, setShowRewriteDiff] = useState(false);
  const [originalBeforeRewrite, setOriginalBeforeRewrite] = useState("");

  const handleRewrite = async () => {
    if (!instruction.trim() || rewriting) return;
    setRewriting(true);
    setShowRewriteDiff(false);
    setOriginalBeforeRewrite(instruction);
    try {
      const resp = await fetch("/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: instruction.trim(),
          videoDuration: video?.duration,
          fileName: video?.fileName,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Rewrite failed");
      setInstruction(data.rewritten);
      setRewriteMethod(data.method);
      setShowRewriteDiff(true);
      setTimeout(() => setShowRewriteDiff(false), 5000);
    } catch (e) {
      console.error("Rewrite failed:", e);
    } finally {
      setRewriting(false);
    }
  };

  // ── Resizable panels ──────────────────────────────────────
  const [leftWidth, setLeftWidth]   = useState(380);  // px
  const [topPct,    setTopPct]      = useState(42);    // %
  const isDraggingH = useRef(false); // horizontal divider (left|right)
  const isDraggingV = useRef(false); // vertical divider (top|bottom)
  const containerRef = useRef<HTMLDivElement>(null);

  const startDragH = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingH.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingH.current) return;
      const newW = Math.min(Math.max(ev.clientX, 220), 640);
      setLeftWidth(newW);
    };
    const onUp = () => {
      isDraggingH.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startDragV = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingV.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    const container = containerRef.current;
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingV.current || !container) return;
      const rect = container.getBoundingClientRect();
      const pct = Math.min(Math.max(((ev.clientY - rect.top) / rect.height) * 100, 20), 75);
      setTopPct(pct);
    };
    const onUp = () => {
      isDraggingV.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
      setError("Unsupported format. Use MP4, WebM, MOV, AVI or MKV."); return;
    }
    const objectUrl = URL.createObjectURL(file);
    const [duration, dims] = await new Promise<[number, {w:number,h:number}]>(res => {
      const v = document.createElement("video"); v.preload = "metadata"; v.src = objectUrl;
      v.onloadedmetadata = () => res([v.duration, {w: v.videoWidth, h: v.videoHeight}]);
      v.onerror = () => res([0,{w:0,h:0}]);
    });
    setUploading(true); setError(null); setResult(null);
    try {
      const fd = new FormData(); fd.append("video", file);
      const resp = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Upload failed");
      const videoInfo = { ...data, duration, objectUrl, fileName: file.name, size: file.size, width: dims.w, height: dims.h };
      setVideo(videoInfo);
      // First edit always starts from the original upload
      setActiveSource({ type: 'upload', storedAs: data.storedAs });
      editVersionRef.current = 0;
      setHistory([]);
    } catch(e) { URL.revokeObjectURL(objectUrl); setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }, []);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if(f) processFile(f); };

  const handleProcess = async () => {
    if (!video || !instruction.trim() || !activeSource) return;
    // Save current result to history before starting new edit
    if (result) {
      setHistory(h => [{ id: result.outputId, instruction, outputFile: result.outputFile, actions: result.actions, timestamp: Date.now(), version: editVersionRef.current }, ...h]);
    }
    setProcessing(true); setError(null); setResult(null);
    try {
      const body: Record<string, unknown> = {
        fileId: video.fileId,
        instruction: instruction.trim(),
        videoDuration: video.duration,
      };
      // Chain from previous output OR original upload
      if (activeSource.type === 'output') {
        body.chainFromOutput = activeSource.outputFile;
      } else {
        body.storedAs = activeSource.storedAs;
      }

      const resp = await fetch("/api/process", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Processing failed");

      editVersionRef.current += 1;
      const version = editVersionRef.current;

      // ✅ Chain: next edit will apply to THIS output
      setActiveSource({ type: 'output', outputFile: data.outputFile, version });

      // Save to history
      setHistory(h => [{ id: data.outputId, instruction: instruction.trim(), outputFile: data.outputFile, actions: data.actions, timestamp: Date.now(), version }, ...h]);
      setResult(data);
    } catch(e) { setError(e instanceof Error ? e.message : "Processing failed"); }
    finally { setProcessing(false); }
  };

  const clearVideo = () => {
    if(video?.objectUrl) URL.revokeObjectURL(video.objectUrl);
    setVideo(null); setResult(null); setHistory([]); setError(null);
    setInstruction(""); setPlaying(false); setCurrentTime(0);
    setActiveSource(null); editVersionRef.current = 0;
  };
  const pct = video ? (currentTime / video.duration) * 100 : 0;

  return (
    <div className="h-screen flex flex-col bg-[#f0f2f8] overflow-hidden">

      {/* ── Top Bar ── */}
      <header className="h-14 bg-white border-b border-black/[0.07] flex items-center px-4 gap-4 shrink-0 shadow-sm z-10">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors group">
          <ArrowLeft size={16} />
          <span className="text-xs font-medium hidden sm:block">Back</span>
        </Link>
        <div className="w-px h-5 bg-black/[0.08]" />

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center">
            <Zap size={14} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-sm text-slate-800">VideoAI <span className="text-violet-600">Editor</span></span>
        </div>

        {/* File name pill */}
        {video && (
          <motion.div initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs font-medium text-violet-700">
            <Film size={11} />
            <span className="max-w-[200px] truncate">{video.fileName}</span>
          </motion.div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* History toggle */}
          {history.length > 0 && (
            <button onClick={() => setShowHistory(h => !h)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                showHistory ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
              }`}>
              <History size={12} />
              History ({history.length})
            </button>
          )}

          <AnimatePresence mode="wait">
            {processing ? (
              <motion.div key="proc" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Processing...
              </motion.div>
            ) : result ? (
              <motion.div key="done" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <CheckCircle2 size={11} /> Done
              </motion.div>
            ) : video ? (
              <motion.div key="ready" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Ready
              </motion.div>
            ) : null}
          </AnimatePresence>

          {result && (
            <a href={`/api/video/${result.outputFile}`} download={`videoai_${Date.now()}.mp4`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 text-white text-xs font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 hover:-translate-y-0.5 transition-all">
              <Download size={12} /> Download
            </a>
          )}
        </div>
      </header>

      {/* ── Main Layout ── */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Source Video ── */}
        <div style={{ width: leftWidth, minWidth: 220, maxWidth: 640 }} className="shrink-0 border-r border-black/[0.07] bg-white flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Source</span>
            </div>
            {video && (
              <button onClick={clearVideo} className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <X size={13} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {!video ? (
              /* Upload Zone */
              <motion.div key="upload" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex flex-col">
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`flex-1 flex flex-col items-center justify-center gap-4 p-8 cursor-pointer transition-all duration-200 ${
                    dragging ? "bg-violet-50 border-2 border-dashed border-violet-400 m-3 rounded-2xl" : "hover:bg-slate-50"
                  }`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative w-14 h-14">
                        <div className="absolute inset-0 rounded-full border-2 border-violet-100" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <motion.div animate={dragging ? {scale:1.1} : {scale:1}}
                        className="w-16 h-16 rounded-2xl bg-violet-50 border-2 border-violet-200 flex items-center justify-center">
                        <Upload size={26} className="text-violet-500" />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700 mb-1">Drop your video here</p>
                        <p className="text-xs text-slate-400">or <span className="text-violet-600 font-semibold">click to browse</span></p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {["MP4","WebM","MOV","AVI","MKV"].map(f => (
                          <span key={f} className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 text-slate-500">{f}</span>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400">Max 500 MB</p>
                    </>
                  )}
                </div>
                {error && (
                  <div className="m-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                    <AlertCircle size={12} className="mt-0.5 shrink-0" /><span>{error}</span>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Video Preview */
              <motion.div key="preview" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex-1 flex flex-col overflow-hidden">
                {/* Player */}
                <div className="relative bg-black aspect-video">
                  <video ref={vidRef} src={video.objectUrl} className="w-full h-full object-contain"
                    onClick={() => { vidRef.current?.paused ? (vidRef.current?.play(), setPlaying(true)) : (vidRef.current?.pause(), setPlaying(false)); }}
                    onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                    onEnded={() => setPlaying(false)}
                  />
                  {!playing && (
                    <div className="absolute inset-0 flex items-center justify-center cursor-pointer"
                      onClick={() => { vidRef.current?.play(); setPlaying(true); }}>
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all">
                        <Play size={20} className="text-white ml-1" fill="white" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Player controls */}
                <div className="px-3 py-2 border-b border-black/[0.05]">
                  <div className="w-full h-1 bg-slate-100 rounded-full mb-2 cursor-pointer overflow-hidden"
                    onClick={e => { const r = e.currentTarget.getBoundingClientRect(); if(vidRef.current) vidRef.current.currentTime = ((e.clientX-r.left)/r.width)*video.duration; }}>
                    <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width:`${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => { vidRef.current?.paused ? (vidRef.current?.play(),setPlaying(true)) : (vidRef.current?.pause(),setPlaying(false)); }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-all">
                      {playing ? <Pause size={14}/> : <Play size={14}/>}
                    </button>
                    <button onClick={() => { if(vidRef.current){vidRef.current.currentTime=0;vidRef.current.play();setPlaying(true);} }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-all"><RotateCcw size={12}/></button>
                    <button onClick={() => { if(vidRef.current){vidRef.current.muted=!muted;setMuted(!muted);} }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-all">
                      {muted ? <VolumeX size={13}/> : <Volume2 size={13}/>}
                    </button>
                    <span className="ml-auto text-[10px] font-mono text-slate-400">{dur(currentTime)} / {dur(video.duration)}</span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-4 flex flex-col gap-2.5 overflow-y-auto">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">File Info</p>
                  {[
                    { icon: Film,     label: "Name",       val: video.fileName },
                    { icon: Clock,    label: "Duration",   val: dur(video.duration) },
                    { icon: Monitor,  label: "Resolution", val: video.width ? `${video.width}×${video.height}` : "—" },
                    { icon: HardDrive,label: "Size",       val: fmt(video.size) },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                        <m.icon size={13} className="text-violet-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">{m.label}</p>
                        <p className="text-xs font-semibold text-slate-700 truncate">{m.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={e => { const f=e.target.files?.[0]; if(f) processFile(f); e.target.value=""; }} />
        </div>

        {/* ── Horizontal Drag Divider ── */}
        <div
          onMouseDown={startDragH}
          className="w-1.5 shrink-0 cursor-col-resize group flex items-center justify-center bg-transparent hover:bg-violet-100 active:bg-violet-200 transition-colors duration-150 relative z-10"
          title="Drag to resize panels"
        >
          <div className="w-0.5 h-10 rounded-full bg-slate-200 group-hover:bg-violet-400 group-active:bg-violet-600 transition-colors" />
        </div>

        {/* ── RIGHT PANEL: Command + Output ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Top section: Command Input ── */}
          <div className="flex flex-col border-b border-black/[0.07]" style={{ height: `${topPct}%` }}>
            <div className="px-5 py-3 border-b border-black/[0.06] bg-white flex items-center gap-2.5 flex-wrap">
              <Sparkles size={14} className="text-violet-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Command</span>
              {video && <span className="text-[10px] text-slate-400">Duration: <span className="font-mono font-semibold text-slate-600">{dur(video.duration)}</span></span>}
              {/* Chain source indicator */}
              {activeSource && (
                <span className={`ml-auto flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                  activeSource.type === 'output'
                    ? 'bg-violet-100 border border-violet-300 text-violet-700'
                    : 'bg-slate-100 border border-slate-200 text-slate-500'
                }`}>
                  {activeSource.type === 'output' ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-violet-500" />Editing from v{activeSource.version}</>
                  ) : (
                    <><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Original source</>
                  )}
                </span>
              )}
            </div>

            <div className="flex-1 flex overflow-hidden bg-white">
              {/* Textarea */}
              <textarea
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                onKeyDown={e => { if((e.ctrlKey||e.metaKey)&&e.key==="Enter") handleProcess(); }}
                placeholder={video
                  ? `Your video is ${dur(video.duration)} long.\n\nDescribe your edits in plain English:\n• "Make it cinematic with slow motion in the middle"\n• "Cut the first 10 seconds and add viral captions"\n• "Apply vintage filter and remove audio"\n\nPress ⌘↵ to process`
                  : "Upload a video on the left first, then describe your edits here..."}
                disabled={!video}
                className="flex-1 resize-none p-5 text-sm text-slate-800 placeholder:text-slate-300 bg-transparent border-none outline-none leading-relaxed font-sans disabled:cursor-not-allowed"
                spellCheck={false}
              />

              {/* Quick commands sidebar */}
              <div className="w-52 border-l border-black/[0.05] overflow-y-auto bg-slate-50/60 shrink-0">
                <p className="px-3 pt-3 pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quick Commands</p>
                <div className="px-2 pb-3 flex flex-col gap-1">
                  {CMDS.map(cmd => (
                    <button key={cmd} onClick={() => setInstruction(cmd)} disabled={!video}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] font-medium text-slate-600 hover:text-violet-700 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all group">
                      <ChevronRight size={10} className="text-slate-300 group-hover:text-violet-400 shrink-0" />
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Command footer */}
            <div className="border-t border-black/[0.06] bg-white">
              {/* Rewrite diff banner */}
              <AnimatePresence>
                {showRewriteDiff && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-5 py-2.5 bg-violet-50 border-b border-violet-100 flex items-start gap-2.5"
                  >
                    <Wand2 size={13} className="text-violet-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold text-violet-600 uppercase tracking-widest">
                          {rewriteMethod === 'gemini' ? '✦ Gemini Rewrite' : '✦ Smart Rewrite'}
                        </span>
                        <span className="text-[9px] text-slate-400">Original:</span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 line-through">{originalBeforeRewrite}</p>
                    </div>
                    <button onClick={() => setShowRewriteDiff(false)} className="text-slate-400 hover:text-slate-600 shrink-0">
                      <X size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">{instruction.length} chars · ⌘↵ to process</span>

                {/* Rewrite button */}
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleRewrite}
                  disabled={rewriting || !instruction.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed
                    bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 text-violet-700
                    hover:from-violet-100 hover:to-purple-100 hover:border-violet-300 hover:shadow-sm hover:shadow-violet-200"
                >
                  {rewriting ? (
                    <><span className="w-3 h-3 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />Rewriting...</>
                  ) : (
                    <><Wand2 size={12} />✨ Rewrite with AI</>
                  )}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleProcess}
                  disabled={processing || !video || !instruction.trim()}
                  className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {processing ? <><span className="spinner" /> Processing...</> : <><Zap size={14} fill="white" /> Process Video</>}
                </motion.button>
              </div>
            </div>
          </div>

          {/* ── Vertical Drag Divider ── */}
          <div
            onMouseDown={startDragV}
            className="h-1.5 shrink-0 cursor-row-resize group flex items-center justify-center bg-transparent hover:bg-violet-100 active:bg-violet-200 transition-colors duration-150"
            title="Drag to resize"
          >
            <div className="h-0.5 w-10 rounded-full bg-slate-200 group-hover:bg-violet-400 group-active:bg-violet-600 transition-colors" />
          </div>

          {/* ── Bottom section: Output + History ── */}
          <div className="flex-1 flex overflow-hidden">

            {/* Output Video */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <div className="px-5 py-3 border-b border-black/[0.06] bg-slate-50 flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Output</span>
                {result && (
                  <div className="ml-2 flex flex-wrap gap-1">
                    {result.actions.slice(0,4).map((a,i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-violet-50 border border-violet-200 text-violet-600">{a.action}</span>
                    ))}
                  </div>
                )}
                {result && (
                  <a href={`/api/video/${result.outputFile}`} download={`videoai_${Date.now()}.mp4`}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-xs font-semibold hover:-translate-y-0.5 transition-all">
                    <Download size={11}/> Download
                  </a>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                  {processing ? (
                    <motion.div key="proc" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                      className="flex flex-col items-center gap-4 text-center">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-2 border-violet-100" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-t-2 border-blue-400 animate-spin" style={{animationDirection:"reverse",animationDuration:"0.8s"}} />
                        <div className="absolute inset-4 rounded-full border-t-2 border-pink-400 animate-spin" style={{animationDuration:"0.6s"}} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700 mb-1">Running FFmpeg...</p>
                        <p className="text-xs text-slate-400 max-w-xs font-mono bg-slate-50 px-3 py-1.5 rounded-lg">
                          &ldquo;{instruction.slice(0,50)}{instruction.length>50?"...":""}&rdquo;
                        </p>
                      </div>
                    </motion.div>
                  ) : result ? (
                    <motion.div key="result" initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} className="w-full h-full bg-black">
                      <video key={result.outputId} src={`/api/video/${result.outputFile}`} controls autoPlay className="w-full h-full object-contain" />
                    </motion.div>
                  ) : (
                    <motion.div key="empty" initial={{opacity:0}} animate={{opacity:1}}
                      className="flex flex-col items-center gap-3 text-center py-12">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
                        <Play size={22} className="text-slate-300 ml-1" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-500">Output video will appear here</p>
                        <p className="text-xs text-slate-400 mt-1">{video ? "Type a command above and click Process" : "Upload a video first"}</p>
                      </div>
                      {error && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs max-w-sm text-left">
                          <AlertCircle size={13} className="shrink-0 mt-0.5"/><span>{error}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ── History Panel ── */}
            <AnimatePresence>
              {showHistory && history.length > 0 && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 260, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="shrink-0 border-l border-black/[0.07] bg-white flex flex-col overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-black/[0.06] bg-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Edit History</span>
                    <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full font-semibold">{history.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {history.map((item, i) => (
                      <motion.div key={item.id}
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={`rounded-xl border p-3 ${
                          i === 0 ? "border-violet-200 bg-violet-50" : "border-slate-100 bg-white hover:border-slate-200"
                        } transition-all`}
                      >
                        {/* Version badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                            i === 0 ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}>
                            {i === 0 ? "Latest" : `v${history.length - i}`}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
                          </span>
                        </div>

                        {/* Instruction */}
                        <p className="text-[11px] text-slate-700 font-medium leading-snug mb-2 line-clamp-2">
                          &ldquo;{item.instruction}&rdquo;
                        </p>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.actions.slice(0,3).map((a,j) => (
                            <span key={j} className="text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{a.action}</span>
                          ))}
                          {item.actions.length > 3 && <span className="text-[8px] text-slate-400">+{item.actions.length-3}</span>}
                        </div>

                        {/* Actions row */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setInstruction(item.instruction); setShowHistory(false); }}
                            className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 transition-all">
                            Re-edit
                          </button>
                          <button
                            onClick={() => { setActiveSource({ type: 'output', outputFile: item.outputFile, version: item.version }); setShowHistory(false); }}
                            title="Apply next edit on top of this version"
                            className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-all">
                            Branch
                          </button>
                          <a
                            href={`/api/video/${item.outputFile}`}
                            download={`videoai_v${item.version}_${Date.now()}.mp4`}
                            className="flex items-center justify-center w-8 h-7 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all">
                            <Download size={11} />
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
