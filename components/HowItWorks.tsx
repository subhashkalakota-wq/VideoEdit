"use client";

import { motion } from "framer-motion";
import { PenLine, BrainCircuit, Film } from "lucide-react";

const STEPS = [
  {
    num: "01", icon: PenLine, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200",
    title: "Upload & Describe",
    desc: "Upload your video file, then write any natural language editing instruction — from simple trims to complex cinematic presets.",
  },
  {
    num: "02", icon: BrainCircuit, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200",
    title: "AI Parses Intent",
    desc: "Our engine analyzes context, infers timestamps using real video duration, detects compound instructions and maps them to atomic operations.",
  },
  {
    num: "03", icon: Film, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200",
    title: "FFmpeg Processes Video",
    desc: "The backend runs real FFmpeg operations and returns a fully processed output video — no JSON, just results you can watch and download.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 px-6 bg-white/40">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <div className="badge mb-4">How It Works</div>
          <h2 className="text-4xl font-extrabold tracking-tight mb-4 text-slate-900">Three Steps to Edited Video</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">No code. No complicated UI. Just describe what you want.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-violet-200 via-blue-200 to-emerald-200" />

          {STEPS.map((step, i) => (
            <motion.div key={step.num}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`rounded-2xl p-8 border ${step.border} bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}
            >
              <div className="text-6xl font-black text-slate-100 absolute top-4 right-6 select-none font-mono">{step.num}</div>
              <div className={`w-12 h-12 rounded-xl ${step.bg} border ${step.border} flex items-center justify-center mb-6`}>
                <step.icon size={22} className={step.color} />
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-900">{step.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
