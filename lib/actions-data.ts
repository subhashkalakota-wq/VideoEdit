import type { ActionMeta, Example } from "./types";

export const ACTION_METADATA: ActionMeta[] = [
  { name: "trim_video",      category: "timeline", icon: "✂️",  color: "#8b5cf6", description: "Trim video to a specific time range", params: ["start", "end"] },
  { name: "cut_segment",     category: "timeline", icon: "🔪",  color: "#ef4444", description: "Remove a segment from the video", params: ["start", "end"] },
  { name: "split_video",     category: "timeline", icon: "⚡",  color: "#f59e0b", description: "Split video at given timestamps", params: ["timestamps"] },
  { name: "add_text",        category: "text",     icon: "📝",  color: "#10b981", description: "Add a text overlay to the video", params: ["text", "start", "end", "position", "style"] },
  { name: "add_subtitles",   category: "text",     icon: "💬",  color: "#06b6d4", description: "Auto-generate subtitles", params: ["language", "auto_generate"] },
  { name: "add_music",       category: "audio",    icon: "🎵",  color: "#ec4899", description: "Add background music", params: ["type", "volume", "start", "end"] },
  { name: "remove_audio",    category: "audio",    icon: "🔇",  color: "#f97316", description: "Mute or remove all audio", params: [] },
  { name: "change_speed",    category: "motion",   icon: "⏩",  color: "#3b82f6", description: "Speed up or slow down the video", params: ["factor", "start", "end"] },
  { name: "reverse_video",   category: "motion",   icon: "⏪",  color: "#6366f1", description: "Reverse video playback", params: ["start", "end"] },
  { name: "zoom",            category: "motion",   icon: "🔍",  color: "#84cc16", description: "Zoom into the video", params: ["start", "end", "level"] },
  { name: "pan",             category: "motion",   icon: "↔️",  color: "#14b8a6", description: "Pan the camera view", params: ["direction", "start", "end"] },
  { name: "blur",            category: "visual",   icon: "🌫️",  color: "#a855f7", description: "Apply blur to a region", params: ["start", "end", "area"] },
  { name: "highlight",       category: "visual",   icon: "✨",  color: "#eab308", description: "Highlight a portion of the video", params: ["start", "end", "intensity"] },
  { name: "add_transition",  category: "effects",  icon: "🎬",  color: "#f43f5e", description: "Add transition between clips", params: ["type", "duration", "position"] },
  { name: "add_effect",      category: "effects",  icon: "🌈",  color: "#8b5cf6", description: "Add a visual effect", params: ["effect_name", "start", "end"] },
  { name: "color_correction",category: "visual",   icon: "🎨",  color: "#22c55e", description: "Adjust brightness, contrast, saturation", params: ["brightness", "contrast", "saturation"] },
  { name: "apply_filter",    category: "visual",   icon: "🖼️",  color: "#0ea5e9", description: "Apply a color filter preset", params: ["filter_name"] },
  { name: "stabilize_video", category: "transform",icon: "📐",  color: "#10b981", description: "Stabilize shaky footage", params: [] },
  { name: "remove_noise",    category: "audio",    icon: "🔕",  color: "#64748b", description: "Remove background audio noise", params: [] },
  { name: "detect_scenes",   category: "analysis", icon: "🎯",  color: "#f59e0b", description: "Auto-detect scene changes", params: [] },
  { name: "auto_highlights", category: "analysis", icon: "🏆",  color: "#ec4899", description: "Auto-generate highlight reel", params: [] },
  { name: "crop",            category: "transform",icon: "🔲",  color: "#6366f1", description: "Crop video frame", params: ["x", "y", "width", "height"] },
  { name: "resize",          category: "transform",icon: "📏",  color: "#3b82f6", description: "Resize video dimensions", params: ["width", "height"] },
  { name: "overlay_image",   category: "visual",   icon: "🖼️",  color: "#14b8a6", description: "Overlay an image on the video", params: ["url", "start", "end", "position"] },
  { name: "add_watermark",   category: "visual",   icon: "💧",  color: "#a78bfa", description: "Add a watermark text or image", params: ["text", "position"] },
];

export const EXAMPLES: Example[] = [
  {
    id: "cinematic",
    label: "Cinematic Style",
    emoji: "🎬",
    prompt: "Make the whole video cinematic with color grading and a slight zoom",
    tags: ["filter", "zoom", "color"],
  },
  {
    id: "viral",
    label: "Go Viral",
    emoji: "🚀",
    prompt: "Make this video go viral — fast pacing, captions, auto highlights",
    tags: ["highlights", "subtitles", "speed"],
  },
  {
    id: "slowmo",
    label: "Slow Mo + Blur",
    emoji: "🐌",
    prompt: "Add slow motion from 10 to 30 seconds and blur the background",
    tags: ["speed", "blur"],
  },
  {
    id: "vlog",
    label: "Vlog Style",
    emoji: "📹",
    prompt: "Vlog style: quick cuts, zoom effect, English subtitles, and upbeat music",
    tags: ["subtitles", "music", "zoom"],
  },
  {
    id: "trim",
    label: "Clean Trim",
    emoji: "✂️",
    prompt: "Cut the first 10 seconds, remove background noise, and stabilize the video",
    tags: ["trim", "noise", "stabilize"],
  },
  {
    id: "music",
    label: "Music + Subs",
    emoji: "🎵",
    prompt: "Add calm background music at 40% volume and auto-generate English subtitles",
    tags: ["music", "subtitles"],
  },
  {
    id: "text",
    label: "Text Overlay",
    emoji: "📝",
    prompt: 'Add text "Subscribe for more!" at the bottom center during the outro with a fade-in animation',
    tags: ["text"],
  },
  {
    id: "effects",
    label: "VFX Pack",
    emoji: "✨",
    prompt: "Add a film grain effect, vignette, and color correct with high contrast and warm tones",
    tags: ["effect", "color"],
  },
];

export function getActionMeta(name: string): ActionMeta | undefined {
  return ACTION_METADATA.find((a) => a.name === name);
}

export const CATEGORY_LABELS: Record<string, string> = {
  timeline: "Timeline",
  text: "Text & Captions",
  audio: "Audio",
  motion: "Motion",
  visual: "Visual",
  effects: "Effects",
  transform: "Transform",
  analysis: "Analysis",
};
