// lib/itunes.ts (we're reusing this file for iTunes API)
// iTunes Search API — free, no API key, real 30s previews!
// Works directly from browser with no CORS issues

// ── Type: shape of an iTunes track ───────────────────────────────
export type Track = {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumArt: string;   // High quality album cover from Apple
  previewUrl: string; // Real 30-second audio preview!
  gradient: string;   // Card background gradient
  liked: boolean;
};

// ── Gradient colors for each card ────────────────────────────────
// Each song gets a unique gradient so cards look different
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

// ── Search iTunes for one song ────────────────────────────────────
export async function searchTrack(
  query: string,
  index: number
): Promise<Track | null> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      query
    )}&media=music&limit=1`;

    const response = await fetch(url);
    const data = await response.json();
    const track = data.results?.[0];

    // Skip if no track or no preview
    if (!track || !track.previewUrl) return null;

    return {
      id:         track.trackId,
      title:      track.trackName,
      artist:     track.artistName,
      album:      track.collectionName,
      albumArt:   track.artworkUrl100.replace("100x100", "400x400"), // Get bigger image
      previewUrl: track.previewUrl, // Real 30s audio!
      gradient:   GRADIENTS[index % GRADIENTS.length],
      liked:      false,
    };
  } catch (error) {
    console.error(`iTunes search failed for "${query}":`, error);
    return null;
  }
}

// ── Trending songs to fetch ───────────────────────────────────────
export const TRENDING_QUERIES = [
  "Espresso Sabrina Carpenter",
  "Not Like Us Kendrick Lamar",
  "APT ROSE Bruno Mars",
  "Kesariya Arijit Singh",
  "Phir Aur Kya Chahiye Arijit Singh",
  "Die With A Smile Lady Gaga",
  "Luther Kendrick Lamar SZA",
  "Tere Vaaste Varun Jain",
];