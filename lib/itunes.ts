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
      return {
        hookStart: result.hook_start,
        hookEnd:   result.hook_end,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Hook timestamp cache (localStorage, keyed by previewUrl) ─────
const CACHE_KEY = "hookify_hook_cache";

function getCachedTimestamp(previewUrl: string): { hookStart: number; hookEnd: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    return cache[previewUrl] ?? null;
  } catch { return null; }
}

function setCachedTimestamp(previewUrl: string, hookStart: number, hookEnd: number) {
  try {
    const raw   = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[previewUrl] = { hookStart, hookEnd };
    // Keep cache under 100 entries
    const keys = Object.keys(cache);
    if (keys.length > 100) delete cache[keys[0]];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

// ── Search iTunes for one song (fast — no AI wait) ───────────────
// Returns immediately with fallback/cached timestamps.
// Caller should fire detectHookWithAI separately in background.
export async function searchTrackFast(
  query: string,
  index: number
): Promise<Track | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`;
    const response = await fetch(url);
    const data     = await response.json();
    const track    = data.results?.[0];
    if (!track || !track.previewUrl) return null;

    // Use cached timestamps if available, else fallback
    const cached  = getCachedTimestamp(track.previewUrl);
    const hookStart = cached?.hookStart ?? MANUAL_TIMESTAMPS[query]?.hookStart ?? 5;
    const hookEnd   = cached?.hookEnd   ?? MANUAL_TIMESTAMPS[query]?.hookEnd   ?? 20;

    return {
      id:         track.trackId,
      title:      track.trackName      ?? "Unknown Title",
      artist:     track.artistName     ?? "Unknown Artist",
      album:      track.collectionName ?? track.trackName ?? "Single",
      albumArt:   track.artworkUrl100?.replace("100x100", "400x400") ?? "",
      previewUrl: track.previewUrl,
      hookStart,
      hookEnd,
      gradient:   GRADIENTS[index % GRADIENTS.length],
      liked:      false,
    };
  } catch {
    return null;
  }
}

// ── Run AI detection in background and update cache ───────────────
export async function detectAndCache(previewUrl: string): Promise<{ hookStart: number; hookEnd: number } | null> {
  const cached = getCachedTimestamp(previewUrl);
  if (cached) return cached; // Already have it
  const result = await detectHookWithAI(previewUrl);
  if (result) setCachedTimestamp(previewUrl, result.hookStart, result.hookEnd);
  return result;
}

// ── Search iTunes for one song (with AI — kept for compatibility) ─
export async function searchTrack(
  query: string,
  index: number
): Promise<Track | null> {
  const track = await searchTrackFast(query, index);
  if (!track) return null;
  const aiResult = await detectAndCache(track.previewUrl);
  if (aiResult) {
    return { ...track, hookStart: aiResult.hookStart, hookEnd: aiResult.hookEnd };
  }
  return track;
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