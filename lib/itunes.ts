// ─────────────────────────────────────────────────────────────────────────────
// lib/itunes.ts
// Core music data layer — iTunes Search API + AI hook detection.
//
// Responsibilities:
//   1. Fetch song metadata + 30s preview URL from iTunes Search API
//   2. Detect hook timestamps via Railway AI server (async, non-blocking)
//   3. Cache AI results in localStorage so repeat visits are instant
//   4. Export the Track type used across the entire app
//
// Loading strategy (fast path):
//   searchTrackFast()  →  returns immediately with cached/fallback timestamps
//   detectAndCache()   →  runs AI in background, updates timestamps silently
//
// This means the feed appears in ~2s regardless of AI server speed.
// ─────────────────────────────────────────────────────────────────────────────

// ── Track type ────────────────────────────────────────────────────
// Shape of a song card throughout the app
export type Track = {
  id:         number;   // iTunes trackId (unique)
  title:      string;
  artist:     string;
  album:      string;
  albumArt:   string;   // 400×400 image URL
  previewUrl: string;   // 30s .m4a audio preview from iTunes
  hookStart:  number;   // Seconds — start of the hook window
  hookEnd:    number;   // Seconds — end of the hook window (hookStart + 15s)
  gradient:   string;   // Tailwind gradient class for card background
  liked:      boolean;  // Whether the current user has saved this hook
};

// ── Card background gradients ─────────────────────────────────────
// Cycled by index so each card in the feed looks distinct
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
// Used when AI is unavailable AND no cached value exists.
// Manually verified against actual songs.
const MANUAL_TIMESTAMPS: Record<string, { hookStart: number; hookEnd: number }> = {
  "Espresso Sabrina Carpenter":            { hookStart: 8,  hookEnd: 23 },
  "Not Like Us Kendrick Lamar":            { hookStart: 5,  hookEnd: 20 },
  "APT ROSE Bruno Mars":                   { hookStart: 10, hookEnd: 25 },
  "Kesariya Arijit Singh":                 { hookStart: 6,  hookEnd: 22 },
  "Phir Aur Kya Chahiye Arijit Singh":     { hookStart: 8,  hookEnd: 24 },
  "Die With A Smile Lady Gaga Bruno Mars": { hookStart: 5,  hookEnd: 20 },
  "Luther Kendrick Lamar SZA":             { hookStart: 7,  hookEnd: 22 },
  "Tere Vaaste Varun Jain":                { hookStart: 6,  hookEnd: 21 },
};

// ── localStorage cache for AI timestamps ─────────────────────────
// Key: iTunes preview URL  →  Value: { hookStart, hookEnd }
// Persists across sessions so the AI never runs twice for the same song.
const CACHE_KEY = "hookify_hook_cache";

function getCachedTimestamp(previewUrl: string): { hookStart: number; hookEnd: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)[previewUrl] ?? null;
  } catch {
    return null;
  }
}

function setCachedTimestamp(previewUrl: string, hookStart: number, hookEnd: number) {
  try {
    const raw   = localStorage.getItem(CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[previewUrl] = { hookStart, hookEnd };

    // Keep cache under 100 entries to avoid filling localStorage
    const keys = Object.keys(cache);
    if (keys.length > 100) delete cache[keys[0]];

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage unavailable (private browsing etc.) — silently ignore
  }
}

// ── AI hook detection ─────────────────────────────────────────────
// Calls our Next.js proxy (/api/detect-hook) which forwards to Railway.
// Railway downloads the audio, runs librosa analysis, returns timestamps.
// Returns null if AI server is down — caller falls back to cache/manual.
async function detectHookWithAI(
  previewUrl: string
): Promise<{ hookStart: number; hookEnd: number } | null> {
  try {
    const res    = await fetch("/api/detect-hook", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ previewUrl }),
    });
    const result = await res.json();

    if (result.success) {
      return { hookStart: result.hook_start, hookEnd: result.hook_end };
    }
    return null;
  } catch {
    return null;
  }
}

// ── searchTrackFast — returns immediately, no AI wait ─────────────
// Fetches iTunes metadata and uses cached or fallback timestamps.
// The caller should fire detectAndCache() separately in the background.
export async function searchTrackFast(
  query: string,
  index: number
): Promise<Track | null> {
  try {
    const url      = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`;
    const response = await fetch(url);
    const data     = await response.json();
    const track    = data.results?.[0];

    if (!track || !track.previewUrl) return null;

    // Prefer cached AI result → manual fallback → default 5–20s
    const cached    = getCachedTimestamp(track.previewUrl);
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
      gradient: GRADIENTS[index % GRADIENTS.length],
      liked:    false,
    };
  } catch {
    return null;
  }
}

// ── detectAndCache — run AI in background + persist result ────────
// Skips AI call if result is already cached.
// Called after the feed is already visible — updates timestamps silently.
export async function detectAndCache(
  previewUrl: string
): Promise<{ hookStart: number; hookEnd: number } | null> {
  // Return cached value immediately if we've seen this song before
  const cached = getCachedTimestamp(previewUrl);
  if (cached) return cached;

  // Run AI and persist the result for future visits
  const result = await detectHookWithAI(previewUrl);
  if (result) setCachedTimestamp(previewUrl, result.hookStart, result.hookEnd);
  return result;
}

// ── searchTrack — full search with AI wait (used in search page) ──
// Kept for compatibility with the search page which can afford to wait
// because AI runs per-song in the background there too.
export async function searchTrack(
  query: string,
  index: number
): Promise<Track | null> {
  const track = await searchTrackFast(query, index);
  if (!track) return null;

  // Try to improve timestamps with AI (returns cached if available)
  const aiResult = await detectAndCache(track.previewUrl);
  if (aiResult) {
    return { ...track, hookStart: aiResult.hookStart, hookEnd: aiResult.hookEnd };
  }
  return track;
}

// ── TRENDING_SONGS — manual fallback list ─────────────────────────
// Used when the iTunes RSS chart fetch fails.
// Manually curated list of well-known songs with verified hook timestamps.
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

// ── fetchAllHooks — fetch the full fallback list ──────────────────
// Runs all TRENDING_SONGS searches in parallel.
// Used as the final fallback when both iTunes RSS and dynamic fetch fail.
export async function fetchAllHooks(): Promise<Track[]> {
  const results = await Promise.all(
    TRENDING_SONGS.map((query, i) => searchTrackFast(query, i))
  );
  return results.filter((t): t is Track => t !== null);
}
