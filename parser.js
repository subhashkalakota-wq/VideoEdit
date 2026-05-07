/**
 * VideoAI Parser Engine
 * Converts natural language video editing instructions into structured JSON actions.
 */

const VIDEO_DURATION = "video_duration";

// ─── Keyword Maps ────────────────────────────────────────────────────────────

const TIME_KEYWORDS = {
  intro: { start: 0, end: 5 },
  beginning: { start: 0, end: 5 },
  start: { start: 0, end: 5 },
  outro: { start: "video_duration - 5", end: VIDEO_DURATION },
  end: { start: "video_duration - 5", end: VIDEO_DURATION },
  ending: { start: "video_duration - 5", end: VIDEO_DURATION },
  middle: { start: "midpoint - 5", end: "midpoint + 5" },
};

const SPEED_KEYWORDS = {
  "slow motion": 0.5,
  "slow-motion": 0.5,
  "slo-mo": 0.5,
  "slow mo": 0.5,
  "slower": 0.5,
  "speed up": 1.5,
  "make it fast": 1.5,
  "faster": 1.5,
  "timelapse": 3.0,
  "time lapse": 3.0,
  "double speed": 2.0,
  "2x speed": 2.0,
  "half speed": 0.5,
};

const FILTER_KEYWORDS = {
  cinematic: "cinematic",
  vintage: "vintage",
  retro: "retro",
  noir: "noir",
  "black and white": "noir",
  grayscale: "noir",
  warm: "warm",
  cool: "cool",
  vivid: "vivid",
  dramatic: "dramatic",
  dreamy: "dreamy",
};

const EFFECT_KEYWORDS = {
  glitch: "glitch",
  "lens flare": "lens_flare",
  bokeh: "bokeh",
  vignette: "vignette",
  "film grain": "film_grain",
  "light leak": "light_leak",
};

const MUSIC_KEYWORDS = {
  "upbeat": "upbeat",
  "calm": "calm",
  "background music": "background",
  "epic": "epic",
  "ambient": "ambient",
  "lofi": "lofi",
  "lo-fi": "lofi",
  "dramatic music": "dramatic",
};

const TRANSITION_TYPES = {
  fade: "fade",
  "fade in": "fade_in",
  "fade out": "fade_out",
  dissolve: "dissolve",
  wipe: "wipe",
  zoom: "zoom_transition",
  slide: "slide",
  crossfade: "crossfade",
  flash: "flash",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findTimeInSeconds(text) {
  // Match patterns like "10 seconds", "2 minutes", "at 0:30"
  const secMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:sec(?:ond)?s?)/i);
  const minMatch = text.match(/(\d+)\s*min(?:ute)?s?/i);
  const colonMatch = text.match(/(?:at\s+)?(\d+):(\d{2})/);

  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  if (minMatch) return parseFloat(minMatch[1]) * 60;
  if (secMatch) return parseFloat(secMatch[1]);
  return null;
}

function findRangeInText(text) {
  // "from X to Y seconds" / "between X and Y" / "X to Y"
  const rangeMatch = text.match(
    /(?:from\s+)?(\d+(?:\.\d+)?)\s*(?:sec(?:ond)?s?)?\s*(?:to|until|through|and)\s*(\d+(?:\.\d+)?)\s*(?:sec(?:ond)?s?)?/i
  );
  if (rangeMatch) {
    return { start: parseFloat(rangeMatch[1]), end: parseFloat(rangeMatch[2]) };
  }
  return null;
}

function resolveTimeKeyword(text) {
  const lower = text.toLowerCase();
  for (const [kw, val] of Object.entries(TIME_KEYWORDS)) {
    if (lower.includes(kw)) return { ...val };
  }
  return null;
}

function confidenceFor(base, modifiers = []) {
  let score = base;
  for (const m of modifiers) score *= m;
  return Math.round(Math.min(1, Math.max(0.3, score)) * 100) / 100;
}

function matchAny(text, keywords) {
  const lower = text.toLowerCase();
  for (const [kw, val] of Object.entries(keywords)) {
    if (lower.includes(kw)) return val;
  }
  return null;
}

function matchAllKeys(text, keywords) {
  const lower = text.toLowerCase();
  const results = [];
  for (const [kw, val] of Object.entries(keywords)) {
    if (lower.includes(kw)) results.push(val);
  }
  return results;
}

// ─── Detectors ───────────────────────────────────────────────────────────────

function detectTrim(text) {
  const lower = text.toLowerCase();
  const isCut = /\b(cut|trim|remove|delete|skip)\b/.test(lower);
  if (!isCut) return null;

  const range = findRangeInText(text);
  if (range) {
    // "cut FROM X TO Y" = trim those out → cut_segment
    if (/\b(cut|remove|delete|skip)\b/.test(lower)) {
      return {
        action: "cut_segment",
        parameters: range,
        confidence: confidenceFor(0.9),
      };
    }
  }

  const sec = findTimeInSeconds(text);
  if (sec !== null) {
    const isFirst = /\b(first|start|beginning|intro)\b/.test(lower);
    const isLast = /\b(last|end|outro|final)\b/.test(lower);
    if (isFirst) {
      return { action: "trim_video", parameters: { start: sec, end: VIDEO_DURATION }, confidence: 0.95 };
    }
    if (isLast) {
      return { action: "trim_video", parameters: { start: 0, end: `video_duration - ${sec}` }, confidence: 0.92 };
    }
  }

  const kwTime = resolveTimeKeyword(text);
  if (kwTime) {
    return { action: "cut_segment", parameters: kwTime, confidence: 0.85 };
  }

  return null;
}

function detectAddText(text) {
  const lower = text.toLowerCase();
  if (!/\b(add|put|show|display|insert|overlay)\b.*\b(text|title|caption|label|subscribe|heading)\b|\b(text|title)\b.*\b(add|put)\b/i.test(text)) return null;

  // Extract quoted text
  const quoted = text.match(/["'"]([^"'"]+)["'"]/);
  const extracted = quoted ? quoted[1] : "Title";

  // Position
  let position = "center";
  if (/\b(bottom|lower)\b/.test(lower)) position = "bottom";
  if (/\b(top|upper)\b/.test(lower)) position = "top";
  if (/\b(left)\b/.test(lower)) position += "_left";
  if (/\b(right)\b/.test(lower)) position += "_right";
  if (position === "center" && /\b(left)\b/.test(lower)) position = "center_left";

  const kwTime = resolveTimeKeyword(text) || {};
  const range = findRangeInText(text) || {};
  const start = kwTime.start !== undefined ? kwTime.start : (range.start !== undefined ? range.start : 0);
  const end = kwTime.end !== undefined ? kwTime.end : (range.end !== undefined ? range.end : VIDEO_DURATION);

  const style = {
    font: "default",
    size: "medium",
    color: "white",
    background: "transparent",
    animation: "fade_in",
  };

  if (/\b(large|big|huge)\b/.test(lower)) style.size = "large";
  if (/\b(small|tiny)\b/.test(lower)) style.size = "small";
  if (/\b(bold)\b/.test(lower)) style.font = "bold";

  return {
    action: "add_text",
    parameters: { text: extracted, start, end, position, style },
    confidence: quoted ? 0.95 : 0.82,
  };
}

function detectSpeed(text) {
  const val = matchAny(text, SPEED_KEYWORDS);
  if (!val) return null;

  const kwTime = resolveTimeKeyword(text) || {};
  const range = findRangeInText(text) || {};
  const start = kwTime.start !== undefined ? kwTime.start : (range.start || 0);
  const end = kwTime.end !== undefined ? kwTime.end : (range.end || VIDEO_DURATION);

  return {
    action: "change_speed",
    parameters: { factor: val, start, end },
    confidence: confidenceFor(0.9),
  };
}

function detectFilter(text) {
  const filter = matchAny(text, FILTER_KEYWORDS);
  if (!filter) return null;
  return {
    action: "apply_filter",
    parameters: { filter_name: filter },
    confidence: 0.93,
  };
}

function detectColorCorrection(text) {
  const lower = text.toLowerCase();
  if (!/\b(color|colour|bright|contrast|saturat|grade|grading|vivid|warm|cool|tone)\b/.test(lower)) return null;

  let brightness = 1.0, contrast = 1.0, saturation = 1.0;

  if (/\b(brighter|increase brightness|lighten)\b/.test(lower)) brightness = 1.15;
  if (/\b(darker|decrease brightness|darken)\b/.test(lower)) brightness = 0.85;
  if (/\b(high contrast|more contrast|dramatic)\b/.test(lower)) contrast = 1.3;
  if (/\b(low contrast|soft)\b/.test(lower)) contrast = 0.8;
  if (/\b(saturate|vivid|vibrant|colorful)\b/.test(lower)) saturation = 1.4;
  if (/\b(desaturate|muted|faded)\b/.test(lower)) saturation = 0.6;
  if (/\b(cinematic|film)\b/.test(lower)) { brightness = 1.05; contrast = 1.1; saturation = 1.2; }
  if (/\b(warm)\b/.test(lower)) { brightness = 1.05; saturation = 1.1; }
  if (/\b(cool)\b/.test(lower)) { saturation = 0.9; brightness = 0.95; }

  if (brightness === 1.0 && contrast === 1.0 && saturation === 1.0) return null;

  return {
    action: "color_correction",
    parameters: { brightness, contrast, saturation },
    confidence: 0.87,
  };
}

function detectSubtitles(text) {
  const lower = text.toLowerCase();
  if (!/\b(subtitle|caption|transcript)\b/.test(lower)) return null;

  const langMatch = text.match(/\b(english|spanish|french|german|hindi|arabic|portuguese|chinese|japanese)\b/i);
  const language = langMatch ? langMatch[1].toLowerCase() : "english";

  return {
    action: "add_subtitles",
    parameters: { language, auto_generate: true },
    confidence: 0.92,
  };
}

function detectMusic(text) {
  const lower = text.toLowerCase();
  if (!/\b(music|audio|sound|song|track|beat)\b/.test(lower)) return null;
  if (/remove|mute|delete/.test(lower)) return null;

  const musicType = matchAny(text, MUSIC_KEYWORDS) || "background";
  const volMatch = text.match(/(\d+)\s*%/);
  const volume = volMatch ? parseInt(volMatch[1]) / 100 : 0.6;

  return {
    action: "add_music",
    parameters: { type: musicType, volume, start: 0, end: VIDEO_DURATION },
    confidence: 0.88,
  };
}

function detectRemoveAudio(text) {
  const lower = text.toLowerCase();
  if (/\b(remove|mute|delete|silence|strip)\b.*\b(audio|sound|music|noise)\b/.test(lower)) {
    return { action: "remove_audio", parameters: {}, confidence: 0.95 };
  }
  return null;
}

function detectTransition(text) {
  const lower = text.toLowerCase();
  const type = matchAny(text, TRANSITION_TYPES);
  if (!type) return null;

  let position = "between_clips";
  if (/\b(intro|beginning|start)\b/.test(lower)) position = "start";
  if (/\b(outro|end|ending)\b/.test(lower)) position = "end";

  const durMatch = text.match(/(\d+(?:\.\d+)?)\s*sec(?:ond)?s?\s*transition/i);
  const duration = durMatch ? parseFloat(durMatch[1]) : 1.0;

  return {
    action: "add_transition",
    parameters: { type, duration, position },
    confidence: 0.9,
  };
}

function detectZoom(text) {
  const lower = text.toLowerCase();
  if (!/\b(zoom|zoomed|punch in)\b/.test(lower)) return null;

  const level = /\b(close|tight|extreme)\b/.test(lower) ? 1.5 : 1.2;
  const kwTime = resolveTimeKeyword(text) || {};
  return {
    action: "zoom",
    parameters: {
      start: kwTime.start !== undefined ? kwTime.start : 0,
      end: kwTime.end !== undefined ? kwTime.end : VIDEO_DURATION,
      level,
    },
    confidence: 0.85,
  };
}

function detectBlur(text) {
  const lower = text.toLowerCase();
  if (!/\b(blur|blurry)\b/.test(lower)) return null;

  const area = /\b(background|bg)\b/.test(lower) ? "background" : "full";
  const kwTime = resolveTimeKeyword(text) || {};
  return {
    action: "blur",
    parameters: {
      start: kwTime.start !== undefined ? kwTime.start : 0,
      end: kwTime.end !== undefined ? kwTime.end : VIDEO_DURATION,
      area,
    },
    confidence: 0.88,
  };
}

function detectReverse(text) {
  const lower = text.toLowerCase();
  if (!/\b(reverse|rewind|backward|backwards)\b/.test(lower)) return null;
  const kwTime = resolveTimeKeyword(text) || {};
  return {
    action: "reverse_video",
    parameters: {
      start: kwTime.start !== undefined ? kwTime.start : 0,
      end: kwTime.end !== undefined ? kwTime.end : VIDEO_DURATION,
    },
    confidence: 0.9,
  };
}

function detectStabilize(text) {
  if (/\b(stabilize|stabilization|shaky|smooth)\b/i.test(text)) {
    return { action: "stabilize_video", parameters: {}, confidence: 0.93 };
  }
  return null;
}

function detectRemoveNoise(text) {
  if (/\b(noise|noisy|denoise|remove noise|background noise)\b/i.test(text)) {
    return { action: "remove_noise", parameters: {}, confidence: 0.9 };
  }
  return null;
}

function detectDetectScenes(text) {
  if (/\b(detect scenes?|scene detection|find scenes?)\b/i.test(text)) {
    return { action: "detect_scenes", parameters: {}, confidence: 0.95 };
  }
  return null;
}

function detectAutoHighlights(text) {
  if (/\b(auto.?highlight|highlight reel|best moments|exciting parts)\b/i.test(text)) {
    return { action: "auto_highlights", parameters: {}, confidence: 0.9 };
  }
  return null;
}

function detectCrop(text) {
  const lower = text.toLowerCase();
  if (!/\b(crop|cropped)\b/.test(lower)) return null;

  // Try to extract dimensions
  const dimMatch = text.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (dimMatch) {
    return {
      action: "crop",
      parameters: { x: 0, y: 0, width: parseInt(dimMatch[1]), height: parseInt(dimMatch[2]) },
      confidence: 0.88,
    };
  }
  return {
    action: "crop",
    parameters: { x: 0, y: 0, width: 1920, height: 1080 },
    confidence: 0.72,
  };
}

function detectResize(text) {
  const dimMatch = text.match(/resize.*?(\d{3,4})\s*[x×p]\s*(\d{3,4})/i) ||
    text.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
  if (dimMatch && /\b(resize|resolution|size)\b/i.test(text)) {
    return {
      action: "resize",
      parameters: { width: parseInt(dimMatch[1]), height: parseInt(dimMatch[2]) },
      confidence: 0.9,
    };
  }
  return null;
}

function detectWatermark(text) {
  const lower = text.toLowerCase();
  if (!/\b(watermark|logo|brand)\b/.test(lower)) return null;

  let position = "bottom_right";
  if (/bottom.left/.test(lower)) position = "bottom_left";
  if (/top.right/.test(lower)) position = "top_right";
  if (/top.left/.test(lower)) position = "top_left";

  const labelMatch = text.match(/watermark.{0,20}["']([^"']+)["']/i);
  const label = labelMatch ? labelMatch[1] : "@YourBrand";

  return {
    action: "add_watermark",
    parameters: { text: label, position },
    confidence: 0.9,
  };
}

function detectEffect(text) {
  const effects = matchAllKeys(text, EFFECT_KEYWORDS);
  return effects.map((eff) => ({
    action: "add_effect",
    parameters: {
      effect_name: eff,
      start: 0,
      end: VIDEO_DURATION,
    },
    confidence: 0.85,
  }));
}

function detectPan(text) {
  const lower = text.toLowerCase();
  if (!/\b(pan)\b/.test(lower)) return null;

  let direction = "right";
  if (/\b(left)\b/.test(lower)) direction = "left";
  if (/\b(up)\b/.test(lower)) direction = "up";
  if (/\b(down)\b/.test(lower)) direction = "down";

  const kwTime = resolveTimeKeyword(text) || {};
  return {
    action: "pan",
    parameters: {
      direction,
      start: kwTime.start !== undefined ? kwTime.start : 0,
      end: kwTime.end !== undefined ? kwTime.end : VIDEO_DURATION,
    },
    confidence: 0.82,
  };
}

function detectHighlight(text) {
  const lower = text.toLowerCase();
  if (!/\b(highlight|emphasized|focus)\b/.test(lower)) return null;
  const kwTime = resolveTimeKeyword(text) || {};
  return {
    action: "highlight",
    parameters: {
      start: kwTime.start !== undefined ? kwTime.start : 0,
      end: kwTime.end !== undefined ? kwTime.end : VIDEO_DURATION,
      intensity: 0.8,
    },
    confidence: 0.78,
  };
}

// ─── Compound Preset Parsers ─────────────────────────────────────────────────

function detectCinematic(text) {
  if (!/\b(cinematic)\b/i.test(text)) return [];
  return [
    { action: "apply_filter", parameters: { filter_name: "cinematic" }, confidence: 0.95 },
    { action: "zoom", parameters: { start: 0, end: VIDEO_DURATION, level: 1.05 }, confidence: 0.88 },
    { action: "color_correction", parameters: { brightness: 1.05, contrast: 1.1, saturation: 1.2 }, confidence: 0.92 },
  ];
}

function detectVlogStyle(text) {
  if (!/\b(vlog.?style|vlog)\b/i.test(text)) return [];
  return [
    { action: "cut_segment", parameters: { start: 0, end: 2 }, confidence: 0.8 },
    { action: "add_subtitles", parameters: { language: "english", auto_generate: true }, confidence: 0.92 },
    { action: "add_music", parameters: { type: "upbeat", volume: 0.5, start: 0, end: VIDEO_DURATION }, confidence: 0.88 },
    { action: "change_speed", parameters: { factor: 1.2, start: 0, end: VIDEO_DURATION }, confidence: 0.83 },
  ];
}

function detectViral(text) {
  if (!/\b(viral)\b/i.test(text)) return [];
  return [
    { action: "auto_highlights", parameters: {}, confidence: 0.92 },
    { action: "add_subtitles", parameters: { language: "english", auto_generate: true }, confidence: 0.95 },
    { action: "change_speed", parameters: { factor: 1.3, start: 0, end: VIDEO_DURATION }, confidence: 0.85 },
    { action: "add_text", parameters: { text: "Don't forget to Like & Subscribe!", start: "video_duration - 5", end: VIDEO_DURATION, position: "bottom", style: { font: "bold", size: "medium", color: "white", background: "rgba(0,0,0,0.5)", animation: "fade_in" } }, confidence: 0.8 },
    { action: "add_music", parameters: { type: "upbeat", volume: 0.4, start: 0, end: VIDEO_DURATION }, confidence: 0.78 },
  ];
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

function parseCommand(text) {
  if (!text || !text.trim()) {
    return { actions: [], error: "No instruction provided" };
  }

  text = text.trim();
  const actions = [];

  // Check for compound presets first
  const cinematicActions = detectCinematic(text);
  const vlogActions = detectVlogStyle(text);
  const viralActions = detectViral(text);

  const isPreset = cinematicActions.length > 0 || vlogActions.length > 0 || viralActions.length > 0;

  if (isPreset) {
    actions.push(...cinematicActions, ...vlogActions, ...viralActions);
  }

  // Always check individual detectors
  const trim = detectTrim(text);
  if (trim && !isPreset) actions.push(trim);

  const text_action = detectAddText(text);
  if (text_action) actions.push(text_action);

  const speed = detectSpeed(text);
  if (speed && !vlogActions.length && !viralActions.length) actions.push(speed);

  // Apply filter only if not cinematic preset
  if (!cinematicActions.length) {
    const filter = detectFilter(text);
    if (filter) actions.push(filter);
  }

  // Color correction only if not cinematic preset
  if (!cinematicActions.length) {
    const color = detectColorCorrection(text);
    if (color) actions.push(color);
  }

  // Subtitles - only if not already added by preset
  if (!vlogActions.length && !viralActions.length) {
    const subs = detectSubtitles(text);
    if (subs) actions.push(subs);
  }

  // Music - only if not already added by preset
  if (!vlogActions.length && !viralActions.length) {
    const music = detectMusic(text);
    if (music) actions.push(music);
  }

  const removeAudio = detectRemoveAudio(text);
  if (removeAudio) actions.push(removeAudio);

  const transition = detectTransition(text);
  if (transition) actions.push(transition);

  const zoom = detectZoom(text);
  if (zoom && !cinematicActions.length) actions.push(zoom);

  const blur = detectBlur(text);
  if (blur) actions.push(blur);

  const reverse = detectReverse(text);
  if (reverse) actions.push(reverse);

  const stabilize = detectStabilize(text);
  if (stabilize) actions.push(stabilize);

  const noise = detectRemoveNoise(text);
  if (noise) actions.push(noise);

  const scenes = detectDetectScenes(text);
  if (scenes) actions.push(scenes);

  const highlights = detectAutoHighlights(text);
  if (highlights && !viralActions.length) actions.push(highlights);

  const crop = detectCrop(text);
  if (crop) actions.push(crop);

  const resize = detectResize(text);
  if (resize) actions.push(resize);

  const watermark = detectWatermark(text);
  if (watermark) actions.push(watermark);

  const effects = detectEffect(text);
  if (effects.length) actions.push(...effects);

  const pan = detectPan(text);
  if (pan) actions.push(pan);

  const highlight = detectHighlight(text);
  if (highlight) actions.push(highlight);

  if (actions.length === 0) {
    return {
      actions: [],
      error: "Unclear or unsupported instruction. Try describing specific video operations like 'cut first 5 seconds' or 'add slow motion'.",
    };
  }

  return { actions };
}
