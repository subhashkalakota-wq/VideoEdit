import { NextResponse } from "next/server";
import { ACTION_METADATA } from "@/lib/actions-data";

export async function GET() {
  return NextResponse.json({ actions: ACTION_METADATA });
}
