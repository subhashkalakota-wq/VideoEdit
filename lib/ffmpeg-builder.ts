import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import type { ParsedAction } from "./types";

// Point fluent-ffmpeg to the Homebrew binary
ffmpeg.setFfmpegPath("/opt/homebrew/bin/ffmpeg");
ffmpeg.setFfprobePath("/opt/homebrew/bin/ffprobe");

export interface ProcessOptions {
  inputPath: string;
  outputPath: string;
  actions: ParsedAction[];
  videoDuration?: number;
  onProgress?: (percent: number) => void;
}

// ─── Filter builders ────────────────────────────────────────────────────────

function resolveTime(val: unknown, duration: number): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const mid = duration / 2;
    try {
      return eval(
        val
          .replace(/video_duration/g, String(duration))
          .replace(/midpoint/g, String(mid))
      ) as number;
    } catch {
      return 0;
    }
  }
  return 0;
}

// ─── Main processing function ────────────────────────────────────────────────

export function processVideo(opts: ProcessOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const { inputPath, outputPath, actions, onProgress } = opts;

    // Probe video for duration/dimensions first
    ffmpeg.ffprobe(inputPath, (err, meta) => {
      if (err) return reject(new Error(`Cannot read video: ${err.message}`));

      const duration = meta.format.duration ?? 60;
      const vstream = meta.streams.find((s) => s.codec_type === "video");
      const hasAudio = meta.streams.some((s) => s.codec_type === "audio");

      // Collect all filters
      const vFilters: string[] = [];
      let audioDisabled = false;
      let trimStart: number | null = null;
      let trimEnd: number | null = null;
      let speedFactor = 1;
      let reversed = false;

      // ── Map actions → FFmpeg params ──
      for (const action of actions) {
        const p = action.parameters;

        switch (action.action) {
          case "trim_video": {
            trimStart = resolveTime(p.start, duration);
            trimEnd = resolveTime(p.end, duration);
            break;
          }
          case "cut_segment": {
            // Remove [start, end] → keep [0, start] + [end, duration]
            // Approximation: trim from 0 to start (simple cut)
            trimEnd = resolveTime(p.start, duration);
            break;
          }
          case "remove_audio": {
            audioDisabled = true;
            break;
          }
          case "change_speed": {
            speedFactor = typeof p.factor === "number" ? p.factor : 1;
            break;
          }
          case "reverse_video": {
            reversed = true;
            break;
          }
          case "color_correction": {
            const br = typeof p.brightness === "number" ? p.brightness - 1 : 0;
            const ct = typeof p.contrast === "number" ? p.contrast : 1;
            const sat = typeof p.saturation === "number" ? p.saturation : 1;
            vFilters.push(`eq=brightness=${br.toFixed(2)}:contrast=${ct.toFixed(2)}:saturation=${sat.toFixed(2)}`);
            break;
          }
          case "apply_filter": {
            switch (p.filter_name) {
              case "cinematic":
                // Safe cinematic: eq + vignette only (no crop/scale)
                vFilters.push("eq=brightness=0.03:contrast=1.12:saturation=1.1");
                vFilters.push("vignette=PI/4");
                break;
              case "vintage":
                vFilters.push("eq=contrast=1.05:saturation=0.8:brightness=-0.02");
                vFilters.push("vignette=PI/5");
                break;
              case "noir":
              case "grayscale":
                vFilters.push("hue=s=0");
                break;
              case "warm":
                vFilters.push("eq=saturation=1.15:brightness=0.02");
                break;
              case "cool":
                vFilters.push("eq=saturation=0.9:brightness=-0.02");
                break;
              case "vivid":
                vFilters.push("eq=saturation=1.6:contrast=1.1");
                break;
              case "dramatic":
                vFilters.push("eq=contrast=1.4:saturation=1.3:brightness=-0.05");
                vFilters.push("vignette=PI/3");
                break;
              case "dreamy":
                vFilters.push("gblur=sigma=1");
                vFilters.push("eq=brightness=0.05:saturation=1.1");
                break;
              default:
                break;
            }
            break;
          }
          case "blur": {
            const area = p.area ?? "full";
            if (area === "full") {
              vFilters.push("boxblur=10:5");
            } else if (area === "background") {
              // Simple approach: gaussian blur with low sigma (simulate bokeh)
              vFilters.push("gblur=sigma=3");
            }
            break;
          }
          case "zoom": {
            const level = typeof p.level === "number" ? Math.min(Math.max(p.level, 1.01), 3.0) : 1.2;
            // Safe zoom using scale + crop with expressions (works on any resolution)
            vFilters.push(`scale=iw*${level}:ih*${level},crop=iw/${level}:ih/${level}`);
            break;
          }
          case "add_text": {
            const text = String(p.text ?? "VideoAI").replace(/'/g, "\\'").replace(/:/g, "\\:");
            const pos = p.position ?? "center";
            const size = p.style?.size === "large" ? 64 : p.style?.size === "small" ? 28 : 42;

            let x = "(w-text_w)/2";
            let y = "(h-text_h)/2";
            if (pos.includes("bottom")) y = "h-th-40";
            if (pos.includes("top")) y = "40";
            if (pos.includes("left")) x = "40";
            if (pos.includes("right")) x = "w-tw-40";

            const ts = resolveTime(p.start, duration);
            const te = resolveTime(p.end, duration);
            vFilters.push(
              `drawtext=text='${text}':fontsize=${size}:fontcolor=white:x=${x}:y=${y}:enable='between(t,${ts},${te})':shadowcolor=black:shadowx=2:shadowy=2:alpha='if(between(t,${ts},${ts}+0.5),(t-${ts})/0.5,1)'`
            );
            break;
          }
          case "crop": {
            if (p.width && p.height) {
              const w = typeof p.width === 'number' ? p.width : parseInt(String(p.width));
              const h = typeof p.height === 'number' ? p.height : parseInt(String(p.height));
              const vw = vstream?.width ?? 0;
              const vh = vstream?.height ?? 0;
              // Only apply crop if target is smaller than source
              if (vw > 0 && vh > 0 && w <= vw && h <= vh) {
                vFilters.push(`crop=${w}:${h}:(iw-${w})/2:(ih-${h})/2`);
              }
            }
            break;
          }
          case "resize": {
            if (p.width && p.height) {
              vFilters.push(`scale=${p.width}:${p.height}`);
            }
            break;
          }
          case "highlight": {
            // Slightly boost brightness and add a subtle glow
            vFilters.push("eq=brightness=0.08:contrast=1.05");
            break;
          }
          case "add_effect": {
            switch (p.effect_name) {
              case "vignette":
                vFilters.push("vignette=PI/3");
                break;
              case "film_grain":
                vFilters.push("noise=alls=15:allf=t+u");
                break;
              case "glitch":
                vFilters.push("rgbashift=rh=3:bh=-3");
                break;
              case "bokeh":
                vFilters.push("gblur=sigma=2");
                break;
              default:
                break;
            }
            break;
          }
          case "stabilize_video": {
            // vidstab requires two-pass — use a single-pass approximation
            vFilters.push("deshake");
            break;
          }
          default:
            break;
        }
      }

      // ── Build FFmpeg command ──
      let cmd = ffmpeg(inputPath);

      // Apply trim via input options (fastest seek)
      if (trimStart !== null) cmd = cmd.inputOption(`-ss ${trimStart}`);
      if (trimEnd !== null) cmd = cmd.inputOption(`-to ${trimEnd}`);

      // Speed filter (must come early)
      if (speedFactor !== 1) {
        const pts = (1 / speedFactor).toFixed(4);
        vFilters.unshift(`setpts=${pts}*PTS`);
      }

      // Reverse
      if (reversed) {
        vFilters.push("reverse");
      }

      // Apply video filters
      if (vFilters.length > 0) {
        cmd = cmd.videoFilter(vFilters);
      }

      // Audio handling
      if (audioDisabled || !hasAudio) {
        cmd = cmd.noAudio();
      } else {
        // Apply audio speed if needed
        if (speedFactor !== 1 && speedFactor >= 0.5 && speedFactor <= 2.0) {
          cmd = cmd.audioFilter(`atempo=${speedFactor}`);
        }
        if (reversed) {
          cmd = cmd.audioFilter("areverse");
        }
      }

      // Output options
      cmd
        .outputOptions([
          "-c:v libx264",
          "-preset fast",
          "-crf 23",
          "-movflags +faststart",
          "-pix_fmt yuv420p",
        ])
        .output(outputPath)
        .on("progress", (prog) => {
          const pct = Math.min(Math.round(prog.percent ?? 0), 99);
          onProgress?.(pct);
        })
        .on("end", () => {
          onProgress?.(100);
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          console.error("FFmpeg stdout:", stdout);
          console.error("FFmpeg stderr:", stderr);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    });
  });
}
