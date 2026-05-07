"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Film, Zap, Download, RotateCcw, CheckCircle2, AlertCircle, Play, X, Clock } from "lucide-react";

interface UploadedVideo { fileId: string; storedAs: string; fileName: string; size: number; duration: number; objectUrl: string; }
interface ProcessResult { outputId: string; outputFile: string; actions: { action: string; confidence: number }[]; instruction: string; }

const fmtBytes = (b: number) => b < 1e6 ? `${(b/1024).toFixed(0)} KB` : `${(b/1e6).toFixed(1)} MB`;
const fmtDur = (s: number) => { const m = Math.floor(s/60), sc = Math.floor(s%60); return `${m}:${String(sc).padStart(2,"0")}`; };

const EXAMPLES = [
  "Make it cinematic", "Add slow motion in the middle", "Cut first 10 seconds",
  "Make it go viral", "Apply vintage filter", "Reverse the video",
  "Remove audio", "Add text 'Subscribe!' at the outro",
];

export default function VideoWorkspace() {
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [instruction, setInstruction] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null); setResult(null);
    if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
      setError("Please upload a video file (MP4, WebM, MOV, AVI, MKV)."); return;
    }
    const objectUrl = URL.createObjectURL(file);
    const duration = await new Promise<number>(res => {
      const v = document.createElement("video"); v.preload = "metadata"; v.src = objectUrl;
      v.onloadedmetadata = () => res(v.duration); v.onerror = () => res(0);
    });
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("video", file);
      const resp = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Upload failed");
      setVideo({ ...data, duration, objectUrl, fileName: file.name, size: file.size });
    } catch (e) { URL.revokeObjectURL(objectUrl); setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  };

  const handleProcess = async () => {
    if (!video || !instruction.trim()) return;
    setError(null); setResult(null); setProcessing(true);
    try {
      const resp = await fetch("/api/process", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: video.fileId, storedAs: video.storedAs, instruction: instruction.trim(), videoDuration: video.duration }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Processing failed");
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Processing failed"); }
    finally { setProcessing(false); }
  };

  const reset = () => { if (video?.objectUrl) URL.revokeObjectURL(video.objectUrl); setVideo(null); setResult(null); setError(null); setInstruction(""); };

  return (
    <section id="workspace" className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {!video ? (
            /* ── UPLOAD ── */
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-10">
                <div className="badge mb-4">Step 1 of 2</div>
                <h2 className="text-4xl font-extrabold tracking-tight mb-3 text-slate-900">Upload Your Video</h2>
                <p className="text-slate-500 text-lg">Drop a video — FFmpeg will process it on the backend after you type your command.</p>
              </div>

              <div onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`relative rounded-3xl border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden
                  ${dragging ? "border-violet-400 bg-violet-50 scale-[1.01]" : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"}`}
              >
                <div className="flex flex-col items-center justify-center gap-5 py-20 px-8 text-center">
                  {uploading ? (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-4">
                      <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-2 border-violet-200" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-violet-600 animate-spin" />
                        <div className="absolute inset-2 rounded-full border-t-2 border-blue-500 animate-spin" style={{ animationDirection: "reverse" }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Uploading to server...</p>
                        <p className="text-xs text-slate-400 mt-1">Saving video for FFmpeg processing</p>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      <motion.div animate={dragging ? { scale: 1.15 } : { scale: 1 }}
                        className="w-20 h-20 rounded-2xl bg-violet-50 border-2 border-violet-200 flex items-center justify-center">
                        <Upload size={32} className="text-violet-500" />
                      </motion.div>
                      <div>
                        <p className="text-xl font-bold text-slate-800 mb-2">{dragging ? "Drop it here!" : "Upload your video"}</p>
                        <p className="text-sm text-slate-500">Drag & drop or <span className="text-violet-600 font-semibold">click to browse</span></p>
                        <p className="text-xs text-slate-400 mt-1">MP4 · WebM · MOV · AVI · MKV &nbsp;·&nbsp; Max 500 MB</p>
                      </div>
                      <div className="flex gap-2">
                        {["MP4","WebM","MOV","AVI","MKV"].map(f => (
                          <span key={f} className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-slate-100 border border-slate-200 text-slate-500">{f}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) handleFile(f); e.target.value=""; }} />

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={15} className="shrink-0" /><span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={13} /></button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* ── COMMAND + OUTPUT ── */
            <motion.div key="workspace" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="text-center mb-8">
                <div className="badge mb-4">Step 2 of 2</div>
                <h2 className="text-4xl font-extrabold tracking-tight mb-3 text-slate-900">Describe Your Edits</h2>
                <p className="text-slate-500 text-lg">Type your instruction — FFmpeg processes the video on the backend.</p>
              </div>

              {/* Video info strip */}
              <div className="flex items-center justify-between mb-6 px-4 py-3 bg-white rounded-2xl border border-black/[0.07] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
                    <Film size={16} className="text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 truncate max-w-[260px]">{video.fileName}</p>
                    <p className="text-xs text-slate-400">{fmtBytes(video.size)} · {fmtDur(video.duration)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <CheckCircle2 size={13} /> Uploaded
                  </span>
                  <button onClick={reset} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Start over">
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {/* Main grid */}
              <div className="grid lg:grid-cols-2 gap-5">
                {/* Left: command input */}
                <div className="bg-white rounded-2xl border border-black/[0.07] shadow-sm flex flex-col focus-within:border-violet-400 focus-within:shadow-violet-500/10 focus-within:shadow-md transition-all">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-black/[0.06] bg-slate-50/60 rounded-t-2xl">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Editing Instruction</span>
                  </div>
                  <textarea value={instruction} onChange={e => setInstruction(e.target.value)}
                    onKeyDown={e => { if((e.ctrlKey||e.metaKey) && e.key==="Enter") handleProcess(); }}
                    placeholder={`Your video is ${fmtDur(video.duration)} long.\n\ne.g. "Cut the first 10 seconds and apply cinematic filter"\n"Add slow motion in the middle"\n"Make it go viral"`}
                    className="parser-textarea flex-1 p-5 min-h-[220px]" spellCheck={false}
                  />

                  {/* Quick examples */}
                  <div className="px-5 py-3 border-t border-black/[0.05] bg-slate-50/40">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">Quick commands</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EXAMPLES.map(ex => (
                        <button key={ex} onClick={() => setInstruction(ex)}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white border border-slate-200 text-slate-600 hover:text-violet-700 hover:border-violet-300 hover:bg-violet-50 transition-all">
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/[0.06] bg-slate-50/60 rounded-b-2xl">
                    <span className="text-xs text-slate-400">{instruction.length} chars · ⌘↵ to process</span>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={handleProcess} disabled={processing || !instruction.trim()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-500 text-white text-sm font-semibold shadow-md shadow-violet-500/20 hover:shadow-violet-500/35 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                      {processing ? <><span className="spinner" /> Processing...</> : <><Zap size={14} fill="white" /> Process Video</>}
                    </motion.button>
                  </div>
                </div>

                {/* Right: output video */}
                <div className="bg-white rounded-2xl border border-black/[0.07] shadow-sm flex flex-col min-h-[440px] overflow-hidden">
                  <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-black/[0.06] bg-slate-50/60 rounded-t-2xl">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Output Video</span>
                  </div>

                  <div className="flex-1 flex flex-col items-center justify-center">
                    <AnimatePresence mode="wait">
                      {processing ? (
                        <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="flex flex-col items-center gap-5 py-16 px-8 text-center w-full">
                          <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-2 border-violet-100" />
                            <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
                            <div className="absolute inset-2 rounded-full border-t-2 border-blue-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
                            <div className="absolute inset-4 rounded-full border-t-2 border-pink-400 animate-spin" style={{ animationDuration: "0.6s" }} />
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-800 mb-1">FFmpeg is processing...</p>
                            <p className="text-sm text-slate-500">Running real video operations on the backend</p>
                            <p className="text-xs text-slate-400 mt-2 font-mono bg-slate-50 px-3 py-1 rounded-lg inline-block">
                              {instruction.slice(0, 55)}{instruction.length > 55 ? "..." : ""}
                            </p>
                          </div>
                        </motion.div>
                      ) : result ? (
                        <motion.div key="result" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="w-full flex flex-col">
                          {/* Video player */}
                          <div className="bg-black aspect-video">
                            <video key={result.outputId} src={`/api/video/${result.outputFile}`} controls autoPlay className="w-full h-full object-contain" />
                          </div>
                          {/* Applied ops */}
                          <div className="p-4 border-t border-black/[0.05]">
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-2 font-semibold">
                              {result.actions.length} operation{result.actions.length !== 1 ? "s" : ""} applied
                            </p>
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {result.actions.map((a, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-violet-50 border border-violet-200 text-violet-700">
                                  {a.action}
                                </span>
                              ))}
                            </div>
                            <a href={`/api/video/${result.outputFile}`} download={`videoai_output_${Date.now()}.mp4`}
                              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5 transition-all">
                              <Download size={14} /> Download Processed Video
                            </a>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex flex-col items-center gap-4 py-16 px-8 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                            <Play size={24} className="text-slate-300 ml-1" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-600">Processed video will appear here</p>
                            <p className="text-xs text-slate-400 mt-1">Type a command and click <span className="text-violet-600 font-semibold">Process Video</span></p>
                          </div>
                          {error && (
                            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-left">
                              <AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {result && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
                  <button onClick={() => { setResult(null); setInstruction(""); setError(null); }}
                    className="text-sm text-slate-400 hover:text-violet-600 transition-colors underline underline-offset-4">
                    Apply another edit to this video
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
