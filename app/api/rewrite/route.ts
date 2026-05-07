import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  instruction:   z.string().min(1).max(2000),
  videoDuration: z.number().positive().optional(),
  fileName:      z.string().optional(),
});

// ── Smart rule-based fallback (no API key needed) ─────────────────────────────
function smartRewrite(instruction: string, duration?: number, fileName?: string): string {
  const text = instruction.toLowerCase().trim();
  const durStr = duration ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : null;
  const fileInfo = fileName ? ` for "${fileName}"` : "";

  const rewrites: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/go viral|make.*viral/, () =>
      `Auto-detect the most engaging ${durStr ? `${Math.ceil(duration! * 0.4)}-second` : "30-second"} highlights, add bold animated captions every 3 seconds, increase tempo by 1.2×, and apply a vibrant color correction with +15% saturation to maximize viewer retention.`],
    [/cinematic/, () =>
      `Apply a film-grade cinematic look${fileInfo}: add 2.39:1 letterbox crop, boost contrast by 15%, desaturate shadows, apply warm highlights (temperature +200K), add subtle vignette, and slow the pacing by 5%.`],
    [/slow.?mo|slow motion/, (m) => {
      const mid = duration ? Math.round(duration / 2) : 30;
      return `Apply 0.4× slow motion from ${mid - 8}s to ${mid + 8}s with smooth motion interpolation, then crossfade back to normal speed with a 0.5s easing transition.`;
    }],
    [/cut.*first\s*(\d+)|trim.*first\s*(\d+)/, (m) => {
      const secs = parseInt(m[1] ?? m[2] ?? "10");
      const endDur = duration ? ` leaving ${Math.round(duration - secs)} seconds of content` : "";
      return `Trim the first ${secs} seconds from the video${endDur}. Ensure clean cut at frame boundary with no audio pop.`;
    }],
    [/cut.*last\s*(\d+)|trim.*last\s*(\d+)/, (m) => {
      const secs = parseInt(m[1] ?? m[2] ?? "10");
      const newEnd = duration ? duration - secs : undefined;
      return `Trim to${newEnd ? ` ${Math.floor(newEnd / 60)}:${String(Math.floor(newEnd % 60)).padStart(2, "0")}` : " remove the last"} ${secs} seconds. Apply clean frame-accurate cut.`;
    }],
    [/vintage|retro/, () =>
      `Apply a 1970s film vintage look: add warm brownish tone (+30 red, +10 green), reduce saturation by 20%, add subtle film grain (noise level 12), apply slight vignette, and add a horizontal scan-line overlay at 8% opacity.`],
    [/noir|black.*white|grayscale/, () =>
      `Convert to high-contrast black and white: remove all color saturation, boost contrast by 25%, darken shadows by 15%, and add a subtle film grain for a classic noir aesthetic.`],
    [/stabil|shaky/, () =>
      `Apply video stabilization using deshake filter with maximum shake detection radius 16px and smoothing factor 10 to eliminate camera shake throughout the video.`],
    [/reverse/, () =>
      `Reverse the entire video playback${durStr ? ` (${durStr} → 0:00)` : ""} and also reverse the audio track to create a complete time-reversal effect.`],
    [/remove.*audio|mute|no.*sound|silent/, () =>
      `Remove all audio tracks from the video, producing a completely silent output file suitable for adding custom background music.`],
    [/text.*['"](.+)['"]|add.*['"](.+)['"]/, (m) => {
      const txt = m[1] ?? m[2] ?? "Text";
      const outroTime = duration ? Math.round(duration - 8) : 20;
      return `Overlay the text "${txt}" in large white bold font (64pt) with a soft drop shadow, fading in at ${outroTime}s and fading out 5 seconds later. Center it horizontally, position 80% from top.`;
    }],
    [/zoom/, () =>
      `Apply a smooth 1.0× to 1.25× progressive zoom over the entire video duration using linear interpolation, keeping the subject centered throughout the zoom motion.`],
    [/vlog/, () =>
      `Apply a bright, punchy vlog style: boost exposure by 10%, increase saturation by 20%, add warm color grade, apply smooth jump-cut transitions every 4–6 seconds, and add upbeat background music at 30% volume.`],
    [/speed.*up|faster|fast/, () =>
      `Increase playback speed to 1.5× with audio pitch correction to maintain natural-sounding voice, resulting in a ${duration ? Math.round(duration / 1.5) : "shorter"}-second output.`],
  ];

  for (const [pattern, fn] of rewrites) {
    const m = text.match(pattern);
    if (m) return fn(m);
  }

  // Generic enhancement
  return `${instruction.charAt(0).toUpperCase()}${instruction.slice(1).replace(/\.$/, "")}${durStr ? ` across the full ${durStr} video` : ""}. Apply changes with smooth transitions and maintain original audio quality throughout.`;
}

// ── Gemini AI rewrite ────────────────────────────────────────────────────────
async function geminiRewrite(instruction: string, duration?: number, fileName?: string): Promise<string> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const context = [
    fileName ? `Video file: "${fileName}"` : null,
    duration ? `Video duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s (${duration.toFixed(1)}s total)` : null,
  ].filter(Boolean).join("\n");

  const prompt = `You are a professional video editing AI assistant. Rewrite the user's rough video editing command into a precise, detailed, technical editing instruction.

${context ? `Context:\n${context}\n` : ""}
Rules:
- Be specific: include exact timings, percentages, filter names, and parameters
- If video duration is given, use real timestamps (e.g. "from 0:30 to 1:00")  
- Keep it to 1-3 sentences maximum
- Only return the rewritten instruction — no explanations, no preamble
- Make it sound like a professional editor wrote it

User's command: "${instruction}"

Rewritten instruction:`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text?.trim() ?? instruction;
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { instruction, videoDuration, fileName } = parsed.data;
    let rewritten: string;
    let method: "gemini" | "smart";

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here") {
      try {
        rewritten = await geminiRewrite(instruction, videoDuration, fileName);
        method = "gemini";
      } catch (e) {
        console.warn("Gemini failed, falling back to smart rewrite:", e);
        rewritten = smartRewrite(instruction, videoDuration, fileName);
        method = "smart";
      }
    } else {
      rewritten = smartRewrite(instruction, videoDuration, fileName);
      method = "smart";
    }

    return NextResponse.json({ rewritten, original: instruction, method });
  } catch (err) {
    console.error("Rewrite error:", err);
    return NextResponse.json({ error: "Rewrite failed" }, { status: 500 });
  }
}
