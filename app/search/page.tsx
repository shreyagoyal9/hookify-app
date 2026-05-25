// app/search/page.tsx
// Search page — fast results first, AI hook detection in background!
// Results appear instantly, hook timestamps update as AI processes each song

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Track } from "@/lib/itunes";
import Image from "next/image";

// ── Gradients for cards ──────────────────────────────────────────
const GRADIENTS = [
  "from-[#1a0533] via-[#2d1b69] to-[#0d1b2a]",
  "from-[#0d2137] via-[#1a3a4a] to-[#0a1628]",
  "from-[#1a0a2e] via-[#2d0a3a] to-[#0d1a1a]",
  "from-[#2a1a0d] via-[#3d2510] to-[#1a0d05]",
  "from-[#0d1a2a] via-[#1a2d3a] to-[#0a1520]",
];

type SearchTrack = Track & { aiDetecting?: boolean };

export default function SearchPage() {
  const [query, setQuery]             = useState("");
  const [results, setResults]         = useState<SearchTrack[]>([]);
  const [loading, setLoading]         = useState(false);
  const [playingId, setPlayingId]     = useState<number | null>(null);
  const [audio, setAudio]             = useState<HTMLAudioElement | null>(null);
  const [error, setError]             = useState("");
  const [showModal, setShowModal]     = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SearchTrack | null>(null);

  // ── Search — show results instantly, AI in background ──────────
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    audio?.pause();
    setPlayingId(null);

    try {
      // Step 1: Search iTunes via our API route (fast!)
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data     = await response.json();

      if (!data.results?.length) {
        setError("No songs found! Try a different search.");
        setLoading(false);
        return;
      }

      // Step 2: Show results IMMEDIATELY with default timestamps
      const initialTracks: SearchTrack[] = data.results
        .filter((t: any) => t.previewUrl)
        .slice(0, 6)
        .map((track: any, i: number) => ({
          id:           track.trackId,
          title:        track.trackName,
          artist:       track.artistName,
          album:        track.collectionName,
          albumArt:     track.artworkUrl100?.replace("100x100", "400x400") ?? "",
          previewUrl:   track.previewUrl,
          hookStart:    5,   // Default — AI will update this
          hookEnd:      20,  // Default — AI will update this
          gradient:     GRADIENTS[i % GRADIENTS.length],
          liked:        false,
          aiDetecting:  true, // Show loading indicator
        }));

      setResults(initialTracks);
      setLoading(false);

      // Step 3: Detect hooks in background for each track
      // UI is already showing — this just updates timestamps quietly
      initialTracks.forEach(async (track, i) => {
        try {
          const aiResponse = await fetch("/api/detect-hook", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ previewUrl: track.previewUrl }),
          });
          const aiResult = await aiResponse.json();

          if (aiResult.success) {
            // Update just this track's timestamps
            setResults((prev) =>
              prev.map((t) =>
                t.id === track.id
                  ? { ...t, hookStart: aiResult.hook_start, hookEnd: aiResult.hook_end, aiDetecting: false }
                  : t
              )
            );
          } else {
            // AI failed — remove detecting indicator
            setResults((prev) =>
              prev.map((t) => t.id === track.id ? { ...t, aiDetecting: false } : t)
            );
          }
        } catch {
          setResults((prev) =>
            prev.map((t) => t.id === track.id ? { ...t, aiDetecting: false } : t)
          );
        }
      });

    } catch {
      setError("Something went wrong. Try again!");
      setLoading(false);
    }
  };

  // ── Play hook ──────────────────────────────────────────────────
  const playHook = (track: SearchTrack) => {
    audio?.pause();
    if (playingId === track.id) {
      setPlayingId(null);
      return;
    }
    const newAudio = new Audio(track.previewUrl);
    newAudio.currentTime = track.hookStart;
    newAudio.ontimeupdate = () => {
      if (newAudio.currentTime >= track.hookEnd) {
        newAudio.pause();
        setPlayingId(null);
      }
    };
    newAudio.play();
    setAudio(newAudio);
    setPlayingId(track.id);
  };

  // ── Open options modal ─────────────────────────────────────────
  const openModal = (track: SearchTrack) => {
    setSelectedTrack(track);
    setShowModal(true);
  };

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col">

      {/* ── OPTIONS MODAL ───────────────────────────────────────── */}
      {showModal && selectedTrack && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0e2a3b] rounded-3xl p-6 w-full max-w-sm border border-[#90e0ef]/20"
          >
            {/* Song info */}
            <div className="flex items-center gap-3 mb-6">
              <img src={selectedTrack.albumArt} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <p className="font-medium">{selectedTrack.title}</p>
                <p className="text-sm text-gray-400">{selectedTrack.artist}</p>
              </div>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { playHook(selectedTrack); setShowModal(false); }}
                className="w-full py-3 rounded-2xl bg-[#90e0ef] text-[#0a0e1a] font-bold text-sm"
              >
                ▶ play hook
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-2xl bg-white/5 text-gray-400 text-sm hover:bg-white/10"
              >
                ❤️ save hook
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-2xl bg-white/5 text-gray-400 text-sm hover:bg-white/10"
              >
                ➕ add to playlist
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-2xl border border-white/10 text-gray-500 text-sm mt-2"
              >
                cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h1 className="text-2xl text-[#90e0ef]" style={{ fontFamily: "cursive" }}>Hookify</h1>
        <a href="/home" className="text-gray-400 text-sm hover:text-white">← back</a>
      </nav>

      {/* ── SEARCH BAR — at the top! ─────────────────────────────── */}
      <div className="px-6 pt-6 pb-4 max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-medium mb-1">find any hook 🎵</h2>
        <p className="text-gray-500 text-xs mb-4">
          results appear instantly — AI detects hooks in background 🤖
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="search any song or artist..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-5 py-3 rounded-full bg-[#131929] border border-[#90e0ef]/20 text-white placeholder-gray-500 outline-none focus:border-[#90e0ef] transition-colors text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-3 rounded-full bg-[#90e0ef] text-[#0a0e1a] font-bold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : "search"}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      {/* ── RESULTS ─────────────────────────────────────────────── */}
      <div className="flex-1 px-6 max-w-2xl mx-auto w-full">
        {loading && (
          <div className="text-center py-8">
            <Image src="/Elephant_Beats.jpeg" alt="Loading" width={50} height={50}
              className="rounded-full border-2 border-[#90e0ef] animate-bounce mx-auto mb-3" />
            <p className="text-[#90e0ef] text-sm animate-pulse">searching...</p>
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              <p className="text-gray-500 text-xs mb-1">
                {results.length} results — tap ▶ to play hook, ··· for options
              </p>

              {results.map((track) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-gradient-to-r ${track.gradient} rounded-2xl p-4 border border-white/10 flex items-center gap-3`}
                >
                  {/* Album art — spins when playing */}
                  <img
                    src={track.albumArt}
                    alt={track.album}
                    className={`w-12 h-12 rounded-full object-cover border-2 flex-shrink-0 transition-all ${
                      playingId === track.id
                        ? "border-[#90e0ef] animate-spin shadow-[0_0_15px_rgba(144,224,239,0.5)]"
                        : "border-white/20"
                    }`}
                    style={{ animationDuration: "4s" }}
                  />

                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{track.title}</p>
                    <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                    {/* AI timestamp badge */}
                    <div className="mt-1">
                      {track.aiDetecting ? (
                        <span className="text-xs text-yellow-400 animate-pulse">🤖 detecting hook...</span>
                      ) : (
                        <span className="text-xs text-[#90e0ef]">
                          🤖 {track.hookStart}s–{track.hookEnd}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Play button */}
                    <button
                      onClick={() => playHook(track)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                        playingId === track.id
                          ? "bg-[#90e0ef] text-[#0a0e1a]"
                          : "bg-white/10 text-white hover:bg-[#90e0ef]/20"
                      }`}
                    >
                      {playingId === track.id ? "⏸" : "▶"}
                    </button>

                    {/* 3 dots — options */}
                    <button
                      onClick={() => openModal(track)}
                      className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-white/20 text-lg"
                    >
                      ···
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}