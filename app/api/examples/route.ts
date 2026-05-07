import { NextResponse } from "next/server";
import { EXAMPLES } from "@/lib/actions-data";

export async function GET() {
  return NextResponse.json({ examples: EXAMPLES });
}
