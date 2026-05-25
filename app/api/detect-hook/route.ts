// app/api/detect-hook/route.ts
// Bridge between Next.js and Railway AI server
// Instead of sending the audio file (too large for Vercel)
// We send just the URL and Railway downloads it directly!

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { previewUrl } = body;

    if (!previewUrl) {
      return NextResponse.json({ error: "No preview URL provided" }, { status: 400 });
    }

    // Send URL to Railway — Railway downloads and analyzes the audio
    const aiResponse = await fetch(
      "https://web-production-c2177.up.railway.app/detect-hook-url",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: previewUrl }),
      }
    );

    const result = await aiResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error("AI server error:", error);
    return NextResponse.json(
      { success: false, error: "AI server not available" },
      { status: 500 }
    );
  }
}