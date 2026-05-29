// ─────────────────────────────────────────────────────────────────────────────
// app/api/detect-hook/route.ts
// Bridge: Next.js (Vercel)  →  Python AI server (Railway)
//
// Why this proxy exists:
//   Vercel has a 4.5 MB request size limit, so we can't send raw audio files.
//   Instead, we send only the iTunes preview URL. Railway then downloads the
//   audio itself, runs the librosa analysis, and returns hook timestamps.
//
// Flow:
//   Browser → POST /api/detect-hook { previewUrl }
//          → Railway /detect-hook-url { url }
//          → { success, hook_start, hook_end, confidence }
//
// If Railway is down or slow, returns { success: false } and the caller
// falls back to manual/cached timestamps gracefully.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

// Railway AI server URL — deployed Python FastAPI
const AI_SERVER = "https://web-production-c2177.up.railway.app";

export async function POST(request: NextRequest) {
  try {
    const { previewUrl } = await request.json();

    if (!previewUrl) {
      return NextResponse.json({ error: "No preview URL provided" }, { status: 400 });
    }

    // Forward the URL to Railway — Railway downloads + analyses the audio
    const aiResponse = await fetch(`${AI_SERVER}/detect-hook-url`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url: previewUrl }),
    });

    const result = await aiResponse.json();
    return NextResponse.json(result);

  } catch {
    // Railway unavailable — caller falls back to manual/cached timestamps
    return NextResponse.json(
      { success: false, error: "AI server not available" },
      { status: 500 }
    );
  }
}