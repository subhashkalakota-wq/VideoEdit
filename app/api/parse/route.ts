import { NextResponse } from "next/server";
import { z } from "zod";
import { parseInstruction } from "@/lib/parser";
import type { ParsedAction } from "@/lib/types";

const schema = z.object({
  instruction: z.string().min(1, "Instruction cannot be empty").max(2000),
  videoDuration: z.number().positive().optional(), // real duration in seconds
});

/** Replace "video_duration" placeholder strings with the actual value */
function resolveTimestamps(actions: ParsedAction[], duration?: number): ParsedAction[] {
  if (!duration) return actions;
  const d: number = duration;  // narrow to non-undefined

  const midpoint = duration / 2;

  function resolve(val: unknown): unknown {
    if (typeof val === "string") {
      return val
        .replace(/video_duration\s*-\s*(\d+(?:\.\d+)?)/g, (_, n) => String(d - parseFloat(n)))
        .replace(/video_duration\s*\+\s*(\d+(?:\.\d+)?)/g, (_, n) => String(d + parseFloat(n)))
        .replace(/video_duration/g, String(d))
        .replace(/midpoint\s*-\s*(\d+(?:\.\d+)?)/g, (_, n) => String(midpoint - parseFloat(n)))
        .replace(/midpoint\s*\+\s*(\d+(?:\.\d+)?)/g, (_, n) => String(midpoint + parseFloat(n)))
        .replace(/midpoint/g, String(midpoint));
    }
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).map(([k, v]) => [k, resolve(v)])
      );
    }
    if (Array.isArray(val)) return val.map(resolve);
    return val;
  }

  return actions.map((action) => ({
    ...action,
    parameters: resolve(action.parameters) as ParsedAction["parameters"],
  }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0];
      const message = firstIssue?.message ?? "Invalid request";
      return NextResponse.json({ actions: [], error: message }, { status: 400 });
    }

    const { instruction, videoDuration } = parsed.data;
    const start = Date.now();
    const result = parseInstruction(instruction);
    const processingMs = Date.now() - start;

    // Resolve placeholder timestamps with real values
    const resolvedActions = resolveTimestamps(result.actions, videoDuration);

    return NextResponse.json({
      ...result,
      actions: resolvedActions,
      instruction,
      videoDuration: videoDuration ?? null,
      parsedAt: new Date().toISOString(),
      processingMs,
    });
  } catch {
    return NextResponse.json({ actions: [], error: "Invalid request body" }, { status: 400 });
  }
}
