// ─────────────────────────────────────────────────────────────────────────────
// app/api/trending/route.ts
// Returns the real iTunes top 25 chart — no API key, no scraping.
//
// Source: iTunes RSS feed (JSON format), updated daily by Apple.
// URL:    https://itunes.apple.com/us/rss/topsongs/limit=25/json
//
// Response shape:
//   { trending: [{ title, artist, searchQuery, rank }] }
//
// searchQuery = "title artist" — passed directly to iTunes Search API
// to find the track and get its preview URL + metadata.
//
// Cached for 1 hour on Vercel edge (revalidate: 3600) to avoid
// hammering the RSS feed on every page load.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

const ITUNES_RSS = "https://itunes.apple.com/us/rss/topsongs/limit=25/json";

export async function GET() {
  try {
    // Cache result for 1 hour — chart doesn't change more than once a day
    const response = await fetch(ITUNES_RSS, { next: { revalidate: 3600 } });
    const data     = await response.json();

    const entries = data?.feed?.entry;
    if (!entries?.length) {
      return NextResponse.json({ error: "No entries in RSS feed" }, { status: 500 });
    }

    // Map each RSS entry to a lean object the frontend can use
    const trending = entries.map((entry: any, index: number) => {
      const title  = entry["im:name"]?.label   ?? "";
      const artist = entry["im:artist"]?.label ?? "";
      return {
        title,
        artist,
        searchQuery: `${title} ${artist}`.trim(), // Used for iTunes track search
        rank: index + 1,
      };
    });

    return NextResponse.json({ trending });

  } catch {
    // If RSS feed is down, home page falls back to the manual TRENDING_SONGS list
    return NextResponse.json({ error: "Failed to fetch trending" }, { status: 500 });
  }
}
