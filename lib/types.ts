// ─── Core Types ───────────────────────────────────────────────────────────────

export type TimeValue = number | string; // number = seconds, string = "video_duration" or expression

export interface TextStyle {
  font: string;
  size: "small" | "medium" | "large";
  color: string;
  background: string;
  animation: "fade_in" | "slide_in" | "typewriter" | "none";
}

export type ActionName =
  | "trim_video"
  | "cut_segment"
  | "split_video"
  | "add_text"
  | "add_subtitles"
  | "add_music"
  | "remove_audio"
  | "change_speed"
  | "reverse_video"
  | "zoom"
  | "pan"
  | "blur"
  | "highlight"
  | "add_transition"
  | "add_effect"
  | "color_correction"
  | "apply_filter"
  | "stabilize_video"
  | "remove_noise"
  | "detect_scenes"
  | "auto_highlights"
  | "crop"
  | "resize"
  | "overlay_image"
  | "add_watermark";

export interface ActionParameters {
  // trim / cut
  start?: TimeValue;
  end?: TimeValue;
  timestamps?: TimeValue[];

  // text
  text?: string;
  position?: string;
  style?: Partial<TextStyle>;

  // subtitles
  language?: string;
  auto_generate?: boolean;

  // music
  type?: string;
  volume?: number;

  // speed / reverse
  factor?: number;

  // zoom
  level?: number;

  // pan
  direction?: "left" | "right" | "up" | "down";

  // blur
  area?: "background" | "face" | "full" | "custom";

  // highlight
  intensity?: number;

  // transition
  duration?: number;

  // effect
  effect_name?: string;

  // color correction
  brightness?: number;
  contrast?: number;
  saturation?: number;

  // filter
  filter_name?: string;

  // crop
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  // resize
  // width, height (shared above)

  // overlay / watermark
  url?: string;

  [key: string]: unknown;
}

export interface ParsedAction {
  action: ActionName;
  parameters: ActionParameters;
  confidence: number;
}

export interface ParseResult {
  actions: ParsedAction[];
  error?: string;
  parsedAt?: string;
  processingMs?: number;
  instruction?: string;
}

export interface HistoryItem {
  id: string;
  instruction: string;
  result: ParseResult;
  timestamp: number;
}

export interface ActionMeta {
  name: ActionName;
  category: ActionCategory;
  icon: string;
  color: string;
  description: string;
  params: string[];
}

export type ActionCategory =
  | "timeline"
  | "text"
  | "audio"
  | "motion"
  | "visual"
  | "effects"
  | "transform"
  | "analysis";

export interface Example {
  id: string;
  label: string;
  emoji: string;
  prompt: string;
  tags: string[];
}
