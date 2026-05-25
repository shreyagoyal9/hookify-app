// app/api/detect-hook/route.ts
// This Next.js API route acts as a bridge between browser and Python AI server
// Browser can't call localhost:8000 directly due to CORS
// So browser calls /api/detect-hook → this route calls Python → returns result

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get the audio file from the browser request
    const formData = await request.formData();
    const file     = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Forward to Python AI server
    const aiFormData = new FormData();
    aiFormData.append("file", file, "preview.m4a");

    const aiResponse = await fetch("https://web-production-c2177.up.railway.app/detect-hook", {
      method: "POST",
      body:   aiFormData,
    });

    const result = await aiResponse.json();
    return NextResponse.json(result);

  } catch (error) {
    // Python server not running — return error
    console.error("AI server error:", error);
    return NextResponse.json(
      { success: false, error: "AI server not available" },
      { status: 500 }
    );
  }
}