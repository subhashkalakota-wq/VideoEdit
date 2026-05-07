import type { ParsedAction, ParseResult, ActionParameters, TextStyle } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
const VIDEO_DURATION = "video_duration";

// ─── Keyword Maps ────────────────────────────────────────────────────────────

const SPEED_KEYWORDS: Record<string, number> = {
  "slow motion": 0.5, "slow-motion": 0.5, "slo-mo": 0.5, "slow mo": 0.5,
  "slower": 0.5, "speed up": 1.5, "make it fast": 1.5, "faster": 1.5,
  "timelapse": 3.0, "time lapse": 3.0, "double speed": 2.0, "2x speed": 2.0,
  "half speed": 0.5, "1.5x": 1.5, "2x": 2.0, "3x": 3.0,
};

const FILTER_KEYWORDS: Record<string, string> = {
  cinematic: "cinematic", vintage: "vintage", retro: "retro",
  noir: "noir", "black and white": "noir", grayscale: "noir",
  warm: "warm", cool: "cool", vivid: "vivid", dramatic: "dramatic",
  dreamy: "dreamy", moody: "moody", faded: "faded",
};

const EFFECT_KEYWORDS: Record<string, string> = {
  glitch: "glitch", "lens flare": "lens_flare", bokeh: "bokeh",
  vignette: "vignette", "film grain": "film_grain", "light leak": "light_leak",
  "grain": "film_grain", "flare": "lens_flare",
};

const MUSIC_KEYWORDS: Record<string, string> = {
  upbeat: "upbeat", calm: "calm", "background music": "background",
  epic: "epic", ambient: "ambient", lofi: "lofi", "lo-fi": "lofi",
  "dramatic music": "dramatic", "chill": "calm", "sad": "ambient",
  "happy": "upbeat", "intense": "epic",
};

const TRANSITION_TYPES: Record<string, string> = {
  fade: "fade", "fade in": "fade_in", "fade out": "fade_out",
  dissolve: "dissolve", wipe: "wipe", zoom: "zoom_transition",
  slide: "slide", crossfade: "crossfade", flash: "flash",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findSeconds(text: string): number | null {
  const secMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:sec(?:ond)?s?)/i);
  const minMatch = text.match(/(\d+)\s*min(?:ute)?s?/i);
  const colonMatch = text.match(/(?:at\s+)?(\d+):(\d{2})/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  if (minMatch) return parseFloat(minMatch[1]) * 60;
  if (secMatch) return parseFloat(secMatch[1]);
  return null;
}

function findRange(text: string): { start: number; end: number } | null {
  const m = text.match(
    /(?:from\s+)?(\d+(?:\.\d+)?)\s*(?:sec(?:ond)?s?)?\s*(?:to|until|through|–|-)\s*(\d+(?:\.\d+)?)\s*(?:sec(?:ond)?s?)?/i
  );
  return m ? { start: parseFloat(m[1]), end: parseFloat(m[2]) } : null;
}

function resolveKeywordTime(text: string): { start: string | number; end: string | number } | null {
  const lower = text.toLowerCase();
  if (/\b(intro|beginning|start)\b/.test(lower)) return { start: 0, end: 5 };
  if (/\b(outro|ending|end)\b/.test(lower)) return { start: "video_duration - 5", end: VIDEO_DURATION };
  if (/\b(middle|midpoint|center)\b/.test(lower)) return { start: "midpoint - 5", end: "midpoint + 5" };
  return null;
}

function matchFirst<T>(text: string, map: Record<string, T>): T | null {
  const lower = text.toLowerCase();
  for (const [kw, val] of Object.entries(map)) {
    if (lower.includes(kw)) return val;
  }
  return null;
}

function matchAll<T>(text: string, map: Record<string, T>): T[] {
  const lower = text.toLowerCase();
  const results: T[] = [];
  for (const [kw, val] of Object.entries(map)) {
    if (lower.includes(kw)) results.push(val);
  }
  return results;
}

function conf(base: number, ...mods: number[]): number {
  let s = base;
  for (const m of mods) s *= m;
  return Math.round(Math.min(1, Math.max(0.3, s)) * 100) / 100;
}

// ─── Individual Detectors ─────────────────────────────────────────────────────

function detectTrim(text: string): ParsedAction | null {
  const lower = text.toLowerCase();
  if (!/\b(cut|trim|remove|delete|skip)\b/.test(lower)) return null;

  const range = findRange(text);
  if (range && /\b(cut|remove|delete|skip)\b/.test(lower)) {
    return { action: "cut_segment", parameters: range, confidence: conf(0.9) };
  }

  const sec = findSeconds(text);
  if (sec !== null) {
    if (/\b(first|start|beginning|intro)\b/.test(lower))
      return { action: "trim_video", parameters: { start: sec, end: VIDEO_DURATION }, confidence: 0.95 };
    if (/\b(last|end|outro|final)\b/.test(lower))
      return { action: "trim_video", parameters: { start: 0, end: `video_duration - ${sec}` }, confidence: 0.92 };
  }

  const kwTime = resolveKeywordTime(text);
  if (kwTime) return { action: "cut_segment", parameters: kwTime, confidence: 0.85 };

  return null;
}

function detectText(text: string): ParsedAction | null {
  if (!/\b(add|put|show|display|insert|overlay)\b.*\b(text|title|caption|label|subscribe)\b|\b(text|title)\b/i.test(text)) return null;

  const quoted = text.match(/["'"]([^"'"]+)["'"]/);
  const extracted = quoted ? quoted[1] : "Title";

  let position = "center";
  const lower = text.toLowerCase();
  if (/\bbottom\b/.test(lower)) position = "bottom";
  else if (/\btop\b/.test(lower)) position = "top";
  if (/\bleft\b/.test(lower)) position += "_left";
  else if (/\bright\b/.test(lower)) position += "_right";

  const kwTime = resolveKeywordTime(text) ?? {};
  const range = findRange(text) ?? {};

  const style: TextStyle = {
    font: /\b(bold)\b/.test(lower) ? "bold" : "default",
    size: /\b(large|big|huge)\b/.test(lower) ? "large" : /\b(small|tiny)\b/.test(lower) ? "small" : "medium",
    color: "white",
    background: "transparent",
    animation: "fade_in",
  };

  return {
    action: "add_text",
    parameters: {
      text: extracted,
      start: (kwTime as { start?: number | string }).start ?? (range as { start?: number }).start ?? 0,
      end: (kwTime as { end?: number | string }).end ?? (range as { end?: number }).end ?? VIDEO_DURATION,
      position,
      style,
    },
    confidence: quoted ? 0.95 : 0.82,
  };
}

function detectSpeed(text: string): ParsedAction | null {
  const val = matchFirst(text, SPEED_KEYWORDS);
  if (!val) return null;

  const kwTime = resolveKeywordTime(text) ?? {};
  const range = findRange(text) ?? {};
  return {
    action: "change_speed",
    parameters: {
      factor: val,
      start: (kwTime as { start?: number | string }).start ?? (range as { start?: number }).start ?? 0,
      end: (kwTime as { end?: number | string }).end ?? (range as { end?: number }).end ?? VIDEO_DURATION,
    },
    confidence: conf(0.9),
  };
}

function detectFilter(text: string): ParsedAction | null {
  const filter = matchFirst(text, FILTER_KEYWORDS);
  if (!filter) return null;
  return { action: "apply_filter", parameters: { filter_name: filter }, confidence: 0.93 };
}

function detectColorCorrection(text: string): ParsedAction | null {
  const lower = text.toLowerCase();
  if (!/\b(color|colour|bright|contrast|saturat|grade|grading|vivid|warm|cool|tone)\b/.test(lower)) return null;

  let brightness = 1.0, contrast = 1.0, saturation = 1.0;

  if (/\b(brighter|lighten|increase brightness)\b/.test(lower)) brightness = 1.15;
  if (/\b(darker|darken|decrease brightness)\b/.test(lower)) brightness = 0.85;
  if (/\b(high contrast|more contrast|dramatic)\b/.test(lower)) contrast = 1.3;
  if (/\b(low contrast|soft)\b/.test(lower)) contrast = 0.8;
  if (/\b(saturate|vivid|vibrant|colorful)\b/.test(lower)) saturation = 1.4;
  if (/\b(desaturate|muted|faded)\b/.test(lower)) saturation = 0.6;
  if (/\b(cinematic|film)\b/.test(lower)) { brightness = 1.05; contrast = 1.1; saturation = 1.2; }
  if (/\b(warm)\b/.test(lower)) { brightness = 1.05; saturation = 1.1; }
  if (/\b(cool)\b/.test(lower)) { saturation = 0.9; brightness = 0.95; }

  if (brightness === 1.0 && contrast === 1.0 && saturation === 1.0) return null;

  return { action: "color_correction", parameters: { brightness, contrast, saturation }, confidence: 0.87 };
}

function detectSubtitles(text: string): ParsedAction | null {
  if (!/\b(subtitle|caption|transcript)\b/.test(text.toLowerCase())) return null;
  const langMatch = text.match(/\b(english|spanish|french|german|hindi|arabic|portuguese|chinese|japanese)\b/i);
  return {
    action: "add_subtitles",
    parameters: { language: langMatch ? langMatch[1].toLowerCase() : "english", auto_generate: true },
    confidence: 0.92,
  };
}

function detectMusic(text: string): ParsedAction | null {
  const lower = text.toLowerCase();
  if (!/\b(music|audio|sound|song|track|beat)\b/.test(lower)) return null;
  if (/\b(remove|mute|delete|silence|strip)\b/.test(lower)) return null;

  const musicType = matchFirst(text, MUSIC_KEYWORDS) ?? "background";
  const volMatch = text.match(/(\d+)\s*%/);
  const volume = volMatch ? parseInt(volMatch[1]) / 100 : 0.6;

  return { action: "add_music", parameters: { type: musicType, volume, start: 0, end: VIDEO_DURATION }, confidence: 0.88 };
}

function detectRemoveAudio(text: string): ParsedAction | null {
  if (/\b(remove|mute|delete|silence|strip)\b.*\b(audio|sound|music)\b/i.test(text))
    return { action: "remove_audio", parameters: {}, confidence: 0.95 };
  return null;
}

function detectTransition(text: string): ParsedAction | null {
  const type = matchFirst(text, TRANSITION_TYPES);
  if (!type) return null;
  const lower = text.toLowerCase();
  let position = "between_clips";
  if (/\b(intro|beginning|start)\b/.test(lower)) position = "start";
  if (/\b(outro|end|ending)\b/.test(lower)) position = "end";
  const durMatch = text.match(/(\d+(?:\.\d+)?)\s*sec.*?transition/i);
  return {
    action: "add_transition",
    parameters: { type, duration: durMatch ? parseFloat(durMatch[1]) : 1.0, position },
    confidence: 0.9,
  };
}

function detectZoom(text: string): ParsedAction | null {
  if (!/\b(zoom|punch.?in)\b/i.test(text)) return null;
  const lower = text.toLowerCase();
  const level = /\b(close|tight|extreme)\b/.test(lower) ? 1.5 : 1.2;
  const kwTime = resolveKeywordTime(text) ?? {};
  return {
    action: "zoom",
    parameters: { start: (kwTime as { start?: number | string }).start ?? 0, end: (kwTime as { end?: number | string }).end ?? VIDEO_DURATION, level },
    confidence: 0.85,
  };
}

function detectBlur(text: string): ParsedAction | null {
  if (!/\b(blur|blurry)\b/i.test(text)) return null;
  const area = /\b(background|bg)\b/.test(text.toLowerCase()) ? "background" : /\b(face|faces)\b/.test(text.toLowerCase()) ? "face" : "full";
  const kwTime = resolveKeywordTime(text) ?? {};
  const range = findRange(text) ?? {};
  return {
    action: "blur",
    parameters: {
      start: (kwTime as { start?: number | string }).start ?? (range as { start?: number }).start ?? 0,
      end: (kwTime as { end?: number | string }).end ?? (range as { end?: number }).end ?? VIDEO_DURATION,
      area,
    },
    confidence: 0.88,
  };
}

function detectReverse(text: string): ParsedAction | null {
  if (!/\b(reverse|rewind|backward)\b/i.test(text)) return null;
  const kwTime = resolveKeywordTime(text) ?? {};
  return {
    action: "reverse_video",
    parameters: { start: (kwTime as { start?: number | string }).start ?? 0, end: (kwTime as { end?: number | string }).end ?? VIDEO_DURATION },
    confidence: 0.9,
  };
}

function detectStabilize(text: string): ParsedAction | null {
  if (/\b(stabilize|stabilization|shaky|smooth)\b/i.test(text))
    return { action: "stabilize_video", parameters: {}, confidence: 0.93 };
  return null;
}

function detectRemoveNoise(text: string): ParsedAction | null {
  if (/\b(noise|noisy|denoise|remove.?noise|background.?noise)\b/i.test(text))
    return { action: "remove_noise", parameters: {}, confidence: 0.9 };
  return null;
}

function detectDetectScenes(text: string): ParsedAction | null {
  if (/\b(detect.?scenes?|scene.?detection|find.?scenes?)\b/i.test(text))
    return { action: "detect_scenes", parameters: {}, confidence: 0.95 };
  return null;
}

function detectAutoHighlights(text: string): ParsedAction | null {
  if (/\b(auto.?highlight|highlight.?reel|best.?moments|exciting.?parts)\b/i.test(text))
    return { action: "auto_highlights", parameters: {}, confidence: 0.9 };
  return null;
}

function detectCrop(text: string): ParsedAction | null {
  if (!/\b(crop|cropped)\b/i.test(text)) return null;
  // Ignore letterbox/cinematic crop mentions — handled by the cinematic preset
  if (/letterbox|2\.39|anamorphic|cinematic/i.test(text)) return null;
  const dimMatch = text.match(/(\d+)\s*[x×]\s*(\d+)/);
  // Only act if explicit pixel dimensions given
  if (!dimMatch) return null;
  return {
    action: "crop",
    parameters: { x: 0, y: 0, width: parseInt(dimMatch[1]), height: parseInt(dimMatch[2]) },
    confidence: 0.88,
  };
}

function detectResize(text: string): ParsedAction | null {
  const dimMatch = text.match(/(?:resize.*?)?(\d{3,4})\s*[x×p]\s*(\d{3,4})/i);
  if (dimMatch && /\b(resize|resolution|size)\b/i.test(text))
    return { action: "resize", parameters: { width: parseInt(dimMatch[1]), height: parseInt(dimMatch[2]) }, confidence: 0.9 };
  return null;
}

function detectWatermark(text: string): ParsedAction | null {
  if (!/\b(watermark|logo|brand)\b/i.test(text)) return null;
  const lower = text.toLowerCase();
  let position = "bottom_right";
  if (/bottom.?left/.test(lower)) position = "bottom_left";
  if (/top.?right/.test(lower)) position = "top_right";
  if (/top.?left/.test(lower)) position = "top_left";
  const labelMatch = text.match(/watermark.{0,20}["']([^"']+)["']/i);
  return {
    action: "add_watermark",
    parameters: { text: labelMatch ? labelMatch[1] : "@YourBrand", position },
    confidence: 0.9,
  };
}

function detectEffects(text: string): ParsedAction[] {
  return matchAll(text, EFFECT_KEYWORDS).map((eff) => ({
    action: "add_effect" as const,
    parameters: { effect_name: eff, start: 0, end: VIDEO_DURATION } as ActionParameters,
    confidence: 0.85,
  }));
}

function detectPan(text: string): ParsedAction | null {
  if (!/\b(pan)\b/i.test(text)) return null;
  const lower = text.toLowerCase();
  const direction = /\bleft\b/.test(lower) ? "left" : /\bup\b/.test(lower) ? "up" : /\bdown\b/.test(lower) ? "down" : "right";
  const kwTime = resolveKeywordTime(text) ?? {};
  return {
    action: "pan",
    parameters: { direction, start: (kwTime as { start?: number | string }).start ?? 0, end: (kwTime as { end?: number | string }).end ?? VIDEO_DURATION },
    confidence: 0.82,
  };
}

// ─── Compound Presets ─────────────────────────────────────────────────────────

function detectCinematic(text: string): ParsedAction[] {
  if (!/\b(cinematic|film.?grade|film.?look|letterbox)\b/i.test(text)) return [];
  return [
    { action: "apply_filter", parameters: { filter_name: "cinematic" }, confidence: 0.95 },
    { action: "color_correction", parameters: { brightness: 1.05, contrast: 1.12, saturation: 1.1 }, confidence: 0.92 },
  ];
}

function detectVlogStyle(text: string): ParsedAction[] {
  if (!/\b(vlog.?style|vlog)\b/i.test(text)) return [];
  return [
    { action: "cut_segment", parameters: { start: 0, end: 2 }, confidence: 0.8 },
    { action: "add_subtitles", parameters: { language: "english", auto_generate: true }, confidence: 0.92 },
    { action: "add_music", parameters: { type: "upbeat", volume: 0.5, start: 0, end: VIDEO_DURATION }, confidence: 0.88 },
    { action: "change_speed", parameters: { factor: 1.2, start: 0, end: VIDEO_DURATION }, confidence: 0.83 },
  ];
}

function detectViral(text: string): ParsedAction[] {
  if (!/\b(viral)\b/i.test(text)) return [];
  return [
    { action: "auto_highlights", parameters: {}, confidence: 0.92 },
    { action: "add_subtitles", parameters: { language: "english", auto_generate: true }, confidence: 0.95 },
    { action: "change_speed", parameters: { factor: 1.3, start: 0, end: VIDEO_DURATION }, confidence: 0.85 },
    {
      action: "add_text",
      parameters: {
        text: "Don't forget to Like & Subscribe!",
        start: "video_duration - 5",
        end: VIDEO_DURATION,
        position: "bottom",
        style: { font: "bold", size: "medium", color: "white", background: "rgba(0,0,0,0.5)", animation: "fade_in" },
      },
      confidence: 0.8,
    },
    { action: "add_music", parameters: { type: "upbeat", volume: 0.4, start: 0, end: VIDEO_DURATION }, confidence: 0.78 },
  ];
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function parseInstruction(text: string): ParseResult {
  if (!text?.trim()) return { actions: [], error: "No instruction provided" };

  const t = text.trim();
  const actions: ParsedAction[] = [];

  // Compound presets
  const cinematicActions = detectCinematic(t);
  const vlogActions = detectVlogStyle(t);
  const viralActions = detectViral(t);
  const isPreset = cinematicActions.length > 0 || vlogActions.length > 0 || viralActions.length > 0;

  if (isPreset) actions.push(...cinematicActions, ...vlogActions, ...viralActions);

  // Individual detectors
  const trim = detectTrim(t);
  if (trim && !isPreset) actions.push(trim);

  const textAction = detectText(t);
  if (textAction) actions.push(textAction);

  const speed = detectSpeed(t);
  if (speed && !vlogActions.length && !viralActions.length) actions.push(speed);

  if (!cinematicActions.length) {
    const filter = detectFilter(t);
    if (filter) actions.push(filter);
    const color = detectColorCorrection(t);
    if (color) actions.push(color);
  }

  if (!vlogActions.length && !viralActions.length) {
    const subs = detectSubtitles(t);
    if (subs) actions.push(subs);
    const music = detectMusic(t);
    if (music) actions.push(music);
  }

  const removeAudio = detectRemoveAudio(t);
  if (removeAudio) actions.push(removeAudio);

  const transition = detectTransition(t);
  if (transition) actions.push(transition);

  if (!cinematicActions.length) {
    const zoom = detectZoom(t);
    if (zoom) actions.push(zoom);
  }

  const blur = detectBlur(t);
  if (blur) actions.push(blur);

  const reverse = detectReverse(t);
  if (reverse) actions.push(reverse);

  const stabilize = detectStabilize(t);
  if (stabilize) actions.push(stabilize);

  const noise = detectRemoveNoise(t);
  if (noise) actions.push(noise);

  const scenes = detectDetectScenes(t);
  if (scenes) actions.push(scenes);

  if (!viralActions.length) {
    const highlights = detectAutoHighlights(t);
    if (highlights) actions.push(highlights);
  }

  const crop = detectCrop(t);
  if (crop) actions.push(crop);

  const resize = detectResize(t);
  if (resize) actions.push(resize);

  const watermark = detectWatermark(t);
  if (watermark) actions.push(watermark);

  actions.push(...detectEffects(t));

  const pan = detectPan(t);
  if (pan) actions.push(pan);

  if (actions.length === 0) {
    return {
      actions: [],
      error: "Unclear or unsupported instruction. Try: 'cut first 5 seconds', 'make it cinematic', 'add slow motion'.",
    };
  }

  return { actions };
}
