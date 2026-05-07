import { NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "tmp", "outputs");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Sanitize - only allow uuid.mp4 filenames
  if (!/^[0-9a-f-]{36}\.mp4$/.test(id)) {
    return NextResponse.json({ error: "Invalid video ID" }, { status: 400 });
  }

  const filePath = path.join(OUTPUT_DIR, id);

  try {
    const [buffer, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":        "video/mp4",
        "Content-Length":      String(fileStat.size),
        "Content-Disposition": `inline; filename="${id}"`,
        "Cache-Control":       "no-store",
        "Accept-Ranges":       "bytes",
      },
    });
  } catch {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
}
