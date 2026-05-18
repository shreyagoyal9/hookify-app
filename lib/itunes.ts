// lib/itunes.ts
// iTunes Search API helper
// We also store MANUAL hook timestamps here (Option A)
// Later our AI model (Option B) will replace these manual timestamps

// ── Type: shape of a Track ───────────────────────────────────────
export type Track = {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  previewUrl: string;
  hookStart: number;  // ← NEW: which second the hook starts at (in the 30s preview)
  hookEnd: number;    // ← NEW: which second the hook ends at
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

// ── Manual hook timestamps ───────────────────────────────────────
// iTunes previews are 30 seconds long
// We manually mark where the HOOK part is within those 30 seconds
// Format: { query, hookStart (seconds), hookEnd (seconds) }
// Option B (AI model) will automate this later!
export const TRENDING_SONGS = [
  { query: "Espresso Sabrina Carpenter",            hookStart: 8,  hookEnd: 23 },
  { query: "Not Like Us Kendrick Lamar",            hookStart: 5,  hookEnd: 20 },
  { query: "APT ROSE Bruno Mars",                   hookStart: 10, hookEnd: 25 },
  { query: "Kesariya Arijit Singh",                 hookStart: 6,  hookEnd: 22 },
  { query: "Phir Aur Kya Chahiye Arijit Singh",     hookStart: 8,  hookEnd: 24 },
  { query: "Die With A Smile Lady Gaga Bruno Mars", hookStart: 5,  hookEnd: 20 },
  { query: "Luther Kendrick Lamar SZA",             hookStart: 7,  hookEnd: 22 },
  { query: "Tere Vaaste Varun Jain",                hookStart: 6,  hookEnd: 21 },
];

// ── Search iTunes for one song ───────────────────────────────────
export async function searchTrack(
  query: string,
  hookStart: number,
  hookEnd: number,
  index: number
): Promise<Track | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&media=music&limit=1`;

    const response = await fetch(url);
    const data = await response.json();
    const track = data.results?.[0];

    if (!track || !track.previewUrl) return null;

    return {
      id:         track.trackId,
      title:      track.trackName,
      artist:     track.artistName,
      album:      track.collectionName,
      albumArt:   track.artworkUrl100.replace("100x100", "400x400"),
      previewUrl: track.previewUrl,
      hookStart,  // Store the hook start time
      hookEnd,    // Store the hook end time
      gradient:   GRADIENTS[index % GRADIENTS.length],
      liked:      false,
    };
  } catch (error) {
    console.error(`iTunes search failed for "${query}":`, error);
    return null;
  }
}

// ── Fetch all trending hooks ─────────────────────────────────────
export async function fetchAllHooks(): Promise<Track[]> {
  const results = await Promise.all(
    TRENDING_SONGS.map((song, i) =>
      searchTrack(song.query, song.hookStart, song.hookEnd, i)
    )
  );
  return results.filter((t): t is Track => t !== null);
}