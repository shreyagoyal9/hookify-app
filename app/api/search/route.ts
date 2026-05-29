// ─────────────────────────────────────────────────────────────────────────────
// app/api/search/route.ts
// Server-side proxy for iTunes song search.
//
// Why a proxy? iTunes doesn't send CORS headers, so calling it directly from
// the browser fails. This route runs on the server (Vercel edge), which has
// no CORS restrictions.
//
// Usage:  GET /api/search?q=blinding+lights
// Returns: raw iTunes search JSON  { results: [...] }
//
// Each result includes: trackId, trackName, artistName, collectionName,
//                       artworkUrl100, previewUrl (30s .m4a)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }

  try {
    // limit=8 gives enough results to fill the search card stack
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=8`;
    const response = await fetch(url);
    const data     = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}