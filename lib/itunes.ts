// lib/itunes.ts
// iTunes Search API helper — now with AI hook detection!
// Flow: search iTunes → get preview URL → send to Python AI → get hook timestamps
// Falls back to manual timestamps if AI server is not running

// ── Type: shape of a Track ───────────────────────────────────────
export type Track = {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  previewUrl: string;
  hookStart: number;  // From AI detector or manual fallback
  hookEnd: number;    // From AI detector or manual fallback
  gradient: string;
  liked: boolean;
};

// ── Gradient colors for cards ────────────────────────────────────
const GRADIENTS = [
  "from-[#1a0533] via-[#2d1b69] to-[#0d1b2a]",
  "from-[#0d2137] via-[#1a3a4a] to-[#0a1628]",
  "from-[#1a0a2e] via-[#2d0a3a] to-[#0d1a1a]",
  "from-[#2a1a0d] via-[#3d2510] to-[#1a0d05]",
  "from-[#0d1a2a] via-[#1a2d3a] to-[#0a1520]",
  "from-[#1a0d2a] via-[#2a1540] to-[#0d0d1a]",
  "from-[#0d2a1a] via-[#1a3d2a] to-[#0a1510]",
  "from-[#2a0d0d] via-[#3d1515] to-[#1a0505]",
];

// ── Manual fallback timestamps ────────────────────────────────────
// Used when AI server is not running
const MANUAL_TIMESTAMPS: Record<string, { hookStart: number; hookEnd: number }> = {
  "Espresso Sabrina Carpenter":            { hookStart: 8,  hookEnd: 23 },
  "Not Like Us Kendrick Lamar":            { hookStart: 5,  hookEnd: 20 },
  "APT ROSE Bruno Mars":                   { hookStart: 10, hookEnd: 25 },
  "Kesariya Arijit Singh":                 { hookStart: 6,  hookEnd: 22 },
  "Phir Aur Kya Chahiye Arijit Singh":     { hookStart: 8,  hookEnd: 24 },
  "Die With A Smile Lady Gaga Bruno Mars": { hookStart: 5,  hookEnd: 20 },
  "Luther Kendrick Lamar SZA":            { hookStart: 7,  hookEnd: 22 },
  "Tere Vaaste Varun Jain":               { hookStart: 6,  hookEnd: 21 },
};

// ── AI Hook Detection ─────────────────────────────────────────────
// Calls our Next.js API route which forwards to Python AI server
// Returns AI-detected hook timestamps or null if AI unavailable
async function detectHookWithAI(
  previewUrl: string
): Promise<{ hookStart: number; hookEnd: number } | null> {
  try {
    // Send just the URL — server downloads audio itself
    const aiResponse = await fetch("/api/detect-hook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previewUrl }),
    });

    const result = await aiResponse.json();

    if (result.success) {
      console.log(`🤖 AI hook: ${result.hook_start}s → ${result.hook_end}s (confidence: ${result.confidence})`);
      return {
        hookStart: result.hook_start,
        hookEnd:   result.hook_end,
      };
    }
    return null;
  } catch (error) {
    console.log("⚠️ AI unavailable, using manual timestamps");
    return null;
  }
}

// ── Search iTunes for one song ───────────────────────────────────
export async function searchTrack(
  query: string,
  index: number
): Promise<Track | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&media=music&limit=1`;

    const response = await fetch(url);
    const data     = await response.json();
    const track    = data.results?.[0];

    if (!track || !track.previewUrl) return null;

    // Start with manual fallback timestamps
    let hookStart = MANUAL_TIMESTAMPS[query]?.hookStart ?? 5;
    let hookEnd   = MANUAL_TIMESTAMPS[query]?.hookEnd   ?? 20;

    // Try AI detection — replaces manual if successful!
    const aiResult = await detectHookWithAI(track.previewUrl);
    if (aiResult) {
      hookStart = aiResult.hookStart;
      hookEnd   = aiResult.hookEnd;
      console.log(`✅ AI timestamps used for "${query}"`);
    } else {
      console.log(`📝 Manual timestamps used for "${query}"`);
    }

    return {
      id:         track.trackId,
      title:      track.trackName,
      artist:     track.artistName,
      album:      track.collectionName,
      albumArt:   track.artworkUrl100.replace("100x100", "400x400"),
      previewUrl: track.previewUrl,
      hookStart,
      hookEnd,
      gradient:   GRADIENTS[index % GRADIENTS.length],
      liked:      false,
    };
  } catch (error) {
    console.error(`iTunes search failed for "${query}":`, error);
    return null;
  }
}

// ── Trending songs list ───────────────────────────────────────────
export const TRENDING_SONGS = [
  "Espresso Sabrina Carpenter",
  "Not Like Us Kendrick Lamar",
  "APT ROSE Bruno Mars",
  "Kesariya Arijit Singh",
  "Phir Aur Kya Chahiye Arijit Singh",
  "Die With A Smile Lady Gaga Bruno Mars",
  "Luther Kendrick Lamar SZA",
  "Tere Vaaste Varun Jain",
];

// ── Fetch all trending hooks ──────────────────────────────────────
export async function fetchAllHooks(): Promise<Track[]> {
  const results = await Promise.all(
    TRENDING_SONGS.map((query, i) => searchTrack(query, i))
  );
  return results.filter((t): t is Track => t !== null);
}