"use client";

import { motion, AnimatePresence } from "framer-motion";
import VideoUploader from "./VideoUploader";
import VideoPlayer from "./VideoPlayer";
import { useVideoContext } from "@/hooks/useVideoContext";

export default function VideoSection() {
  const { video } = useVideoContext();

  return (
    <section id="upload" className="py-20 px-6 border-b border-white/[0.05]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="badge mb-4">Step 1</div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-3">
            Upload Your Video
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Upload a video — we analyse it instantly, then you describe your edits in plain English below.
          </p>
        </motion.div>

        {/* Upload → Player transition */}
        <AnimatePresence mode="wait">
          {video ? (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
            >
              <VideoPlayer />
            </motion.div>
          ) : (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
            >
              <VideoUploader />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
