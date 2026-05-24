// app/api/search/route.ts
// Server-side iTunes search — avoids CORS issues in browser
// Browser calls /api/search → this route calls iTunes → returns results

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  
  if (!query) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=5`;
    const response = await fetch(url);
    const data     = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}