import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Allow large video uploads up to 500 MB
export const maxDuration = 300;
export const dynamic = "force-dynamic";



const UPLOAD_DIR = path.join(process.cwd(), "tmp", "uploads");

export async function POST(req: Request) {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const formData = await req.formData();
    const file = formData.get("video") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Validate file type
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/ogg"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
      return NextResponse.json({ error: "Unsupported video format" }, { status: 400 });
    }

    // Size limit: 500 MB
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 500 MB)" }, { status: 413 });
    }

    const ext = file.name.split(".").pop() ?? "mp4";
    const fileId = uuidv4();
    const fileName = `${fileId}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      fileId,
      fileName: file.name,
      size: file.size,
      type: file.type,
      storedAs: fileName,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

