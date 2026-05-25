// app/api/trending/route.ts
// Fetches real trending music from YouTube India
// Cleans titles and extracts artist names for iTunes search

import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=10&regionCode=IN&maxResults=15&key=${apiKey}`;
    
    const response = await fetch(url, { 
      next: { revalidate: 3600 } // Cache 1 hour
    });
    const data = await response.json();

    if (!data.items) {
      return NextResponse.json({ error: "No trending videos" }, { status: 500 });
    }

    const trending = data.items
      .map((item: any) => {
        let title = item.snippet.title;
        const channel = item.snippet.channelTitle
          .replace(/ - Topic$/i, "")
          .replace(/ Official$/i, "")
          .trim();

        // ── Clean the title aggressively ──────────────────────────
        title = title
          .replace(/\(Official.*?\)/gi, "")
          .replace(/\[Official.*?\]/gi, "")
          .replace(/\(Full.*?Video\)/gi, "")
          .replace(/\(Lyric.*?\)/gi, "")
          .replace(/\(Audio.*?\)/gi, "")
          .replace(/#[^\s]*/g, "")           // Remove hashtags
          .replace(/\|.*/g, "")              // Remove everything after |
          .replace(/- Full.*$/gi, "")        // Remove "- Full Song" etc
          .replace(/Full Song.*/gi, "")
          .replace(/Video Song.*/gi, "")
          .replace(/New.*Song.*/gi, "")
          .replace(/\d{4}/g, "")             // Remove years
          .replace(/[^\w\s\u0900-\u097F-]/g, "") // Keep letters, Hindi chars, hyphens
          .replace(/\s+/g, " ")
          .trim();

        // Skip if title is too short or in non-English/Hindi
        if (title.length < 3) return null;

        // Build iTunes search query: "song title channel name"
        const searchQuery = `${title} ${channel}`.trim();

        return {
          youtubeTitle: item.snippet.title,
          cleanTitle:   title,
          channel,
          videoId:      item.id,
          thumbnail:    item.snippet.thumbnails?.medium?.url,
          searchQuery,
        };
      })
      .filter(Boolean); // Remove nulls

    return NextResponse.json({ trending });

  } catch (error) {
    console.error("YouTube API error:", error);
    return NextResponse.json({ error: "Failed to fetch trending" }, { status: 500 });
  }
}