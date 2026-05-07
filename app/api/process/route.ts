import { NextResponse } from "next/server";
import { z } from "zod";
import { mkdir, access } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { parseInstruction } from "@/lib/parser";
import { processVideo } from "@/lib/ffmpeg-builder";

const UPLOAD_DIR = path.join(process.cwd(), "tmp", "uploads");
const OUTPUT_DIR = path.join(process.cwd(), "tmp", "outputs");

const schema = z.object({
  fileId:         z.string().uuid(),
  // Original upload file (first edit)
  storedAs:       z.string().optional(),
  // Previous output file to chain from (subsequent edits)
  chainFromOutput: z.string().optional(),
  instruction:    z.string().min(1).max(2000),
  videoDuration:  z.number().positive().optional(),
});

export async function POST(req: Request) {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { fileId, storedAs, chainFromOutput, instruction, videoDuration } = parsed.data;

    // Resolve input path — chain from previous output, or use original upload
    let inputPath: string;
    if (chainFromOutput) {
      // Validate filename safety (uuid.mp4 only)
      if (!/^[0-9a-f-]{36}\.mp4$/.test(chainFromOutput)) {
        return NextResponse.json({ error: "Invalid chain source file." }, { status: 400 });
      }
      inputPath = path.join(OUTPUT_DIR, chainFromOutput);
    } else if (storedAs) {
      inputPath = path.join(UPLOAD_DIR, storedAs);
    } else {
      return NextResponse.json({ error: "Either storedAs or chainFromOutput is required." }, { status: 400 });
    }

    // Verify source file exists
    try {
      await access(inputPath);
    } catch {
      return NextResponse.json({
        error: chainFromOutput
          ? "Previous output not found. It may have expired — please re-upload your video."
          : "Source video not found. Please upload again.",
      }, { status: 404 });
    }

    // Parse instruction → actions
    const parseResult = parseInstruction(instruction);
    if (parseResult.error || parseResult.actions.length === 0) {
      return NextResponse.json(
        { error: parseResult.error ?? "No recognisable editing actions found. Try: 'Make it cinematic', 'Cut first 10 seconds', 'Add slow motion'" },
        { status: 422 }
      );
    }

    // Prepare output
    const outputId = uuidv4();
    const outputPath = path.join(OUTPUT_DIR, `${outputId}.mp4`);

    // Run FFmpeg
    await processVideo({
      inputPath,
      outputPath,
      actions: parseResult.actions,
      videoDuration,
    });

    return NextResponse.json({
      outputId,
      outputFile: `${outputId}.mp4`,
      actions: parseResult.actions,
      instruction,
      chainedFrom: chainFromOutput ?? null,
      processedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Processing error:", err);
    const message = err instanceof Error ? err.message : "Video processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
