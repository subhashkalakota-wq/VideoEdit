"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, RotateCcw,
  Film, Clock, Monitor, HardDrive, Trash2, CheckCircle2,
} from "lucide-react";
import { useVideoContext } from "@/hooks/useVideoContext";

function formatDuration(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoPlayer() {
  const { video, clearVideo } = useVideoContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  if (!video) return null;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const restart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setPlaying(true);
  };

  const pct = video.duration > 0 ? (currentTime / video.duration) * 100 : 0;
  const codec = video.type.split("/")[1]?.toUpperCase() ?? "VIDEO";
  const resolution =
    video.width && video.height
      ? `${video.width}×${video.height}`
      : "Unknown";

  const META = [
    { icon: Clock,   label: "Duration",   value: formatDuration(video.duration) },
    { icon: Monitor, label: "Resolution", value: resolution },
    { icon: HardDrive, label: "Size",     value: formatBytes(video.size) },
    { icon: Film,    label: "Format",     value: codec },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* ── Analysed badge ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">Video analysed — ready for commands</span>
        </div>
        <button
          onClick={clearVideo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-white/[0.08] text-xs text-slate-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* ── Video preview ── */}
        <div className="lg:col-span-3 glass rounded-2xl border border-white/[0.08] overflow-hidden">
          {/* Video */}
          <div className="relative bg-black aspect-video">
            <video
              ref={videoRef}
              src={video.objectUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onEnded={() => setPlaying(false)}
              onClick={togglePlay}
            />
            {/* Play overlay when paused */}
            {!playing && (
              <div
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                onClick={togglePlay}
              >
                <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all">
                  <Play size={22} className="text-white ml-1" fill="white" />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="px-4 py-3 border-t border-white/[0.06]">
            {/* Progress bar */}
            <div
              className="w-full h-1.5 bg-white/10 rounded-full mb-3 cursor-pointer overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                if (videoRef.current) {
                  videoRef.current.currentTime = ratio * video.duration;
                }
              }}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Buttons + time */}
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all">
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={restart} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all">
                <RotateCcw size={14} />
              </button>
              <button onClick={toggleMute} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all">
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <span className="ml-auto font-mono text-xs text-slate-500">
                {formatDuration(currentTime)} / {formatDuration(video.duration)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Metadata panel ── */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* File name */}
          <div className="glass rounded-2xl border border-white/[0.08] p-4">
            <div className="flex items-center gap-2.5 mb-1">
              <Film size={14} className="text-violet-400 shrink-0" />
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">File</p>
            </div>
            <p className="text-sm font-semibold text-white truncate" title={video.name}>
              {video.name}
            </p>
          </div>

          {/* Metadata grid */}
          {META.map((m) => (
            <div key={m.label} className="glass rounded-xl border border-white/[0.07] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <m.icon size={14} className="text-violet-400" />
              </div>
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-medium">{m.label}</p>
                <p className="text-sm font-bold text-white">{m.value}</p>
              </div>
            </div>
          ))}

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-500/8 border border-violet-500/20"
          >
            <span className="text-lg">👇</span>
            <p className="text-xs text-violet-300 font-medium">
              Scroll down and type your editing commands
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
