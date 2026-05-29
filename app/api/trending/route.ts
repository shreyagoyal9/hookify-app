// app/api/trending/route.ts
// Fetches real top songs from iTunes RSS feed (no API key needed)
// Returns a list of search queries ready for iTunes search

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // iTunes top 25 songs RSS — free, no key, updated daily
    const rssUrl =
      "https://itunes.apple.com/us/rss/topsongs/limit=25/json";

    const response = await fetch(rssUrl, { next: { revalidate: 3600 } });
    const data = await response.json();

    const entries = data?.feed?.entry;
    if (!entries?.length) {
      return NextResponse.json({ error: "No entries" }, { status: 500 });
    }

    const trending = entries.map((entry: any) => {
      const title  = entry["im:name"]?.label ?? "";
      const artist = entry["im:artist"]?.label ?? "";
      return {
        title,
        artist,
        searchQuery: `${title} ${artist}`.trim(),
        rank: entries.indexOf(entry) + 1,
      };
    });

    return NextResponse.json({ trending });
  } catch (error) {
    console.error("iTunes RSS error:", error);
    return NextResponse.json({ error: "Failed to fetch trending" }, { status: 500 });
  }
}
