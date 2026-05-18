// app/api/hooks/route.ts
// Next.js API Route — runs on SERVER side
// Frontend calls this at /api/hooks to get trending songs from Deezer

import { NextResponse } from "next/server";
import { getTrendingHooks } from "@/lib/deezer";

export async function GET() {
  try {
    const hooks = await getTrendingHooks();
    return NextResponse.json({ hooks });
  } catch (error) {
    console.error("Deezer API error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}