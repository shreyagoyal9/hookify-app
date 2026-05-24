// app/search/page.tsx
// Search page — search any song and get its hook detected by AI!

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Track } from "@/lib/itunes";
import Image from "next/image";

export default function SearchPage() {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<Track[]>([]);
  const [loading, setLoading]       = useState(false);
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [audio, setAudio]           = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [error, setError]           = useState("");

  // ── Search iTunes + run AI hook detection ──────────────────────
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);

    try {
      // Search iTunes for up to 5 results
      const url = `/api/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url);
      const data     = await response.json();

      if (!data.results?.length) {
        setError("No songs found! Try a different search.");
        setLoading(false);
        return;
      }

      // Process each result — run AI hook detection on each!
      const tracks: Track[] = [];

      for (const [i, track] of data.results.entries()) {
        if (!track.previewUrl) continue;

        // Default timestamps
        let hookStart = 5;
        let hookEnd   = 20;

        try {
          // Run AI hook detection!
          const audioResponse = await fetch(track.previewUrl);
          const audioBlob     = await audioResponse.blob();
          const formData      = new FormData();
          formData.append("file", audioBlob, "preview.m4a");

          const aiResponse = await fetch("/api/detect-hook", {
            method: "POST",
            body:   formData,
          });
          const aiResult = await aiResponse.json();

          if (aiResult.success) {
            hookStart = aiResult.hook_start;
            hookEnd   = aiResult.hook_end;
          }
        } catch {
          // AI failed — use defaults
        }

        const GRADIENTS = [
          "from-[#1a0533] via-[#2d1b69] to-[#0d1b2a]",
          "from-[#0d2137] via-[#1a3a4a] to-[#0a1628]",
          "from-[#1a0a2e] via-[#2d0a3a] to-[#0d1a1a]",
          "from-[#2a1a0d] via-[#3d2510] to-[#1a0d05]",
          "from-[#0d1a2a] via-[#1a2d3a] to-[#0a1520]",
        ];

        tracks.push({
          id:         track.trackId,
          title:      track.trackName,
          artist:     track.artistName,
          album:      track.collectionName,
          albumArt:   track.artworkUrl100?.replace("100x100", "400x400") ?? "",
          previewUrl: track.previewUrl,
          hookStart,
          hookEnd,
          gradient:   GRADIENTS[i % GRADIENTS.length],
          liked:      false,
        });
      }

      setResults(tracks);
    } catch {
      setError("Something went wrong. Try again!");
    }

    setLoading(false);
  };

  // ── Play hook of a track ───────────────────────────────────────
  const playHook = (track: Track) => {
    // Stop current audio
    audio?.pause();

    if (playingTrack?.id === track.id && isPlaying) {
      // Pause if same track
      setIsPlaying(false);
      setPlayingTrack(null);
      return;
    }

    // Play new track from hook start
    const newAudio = new Audio(track.previewUrl);
    newAudio.currentTime = track.hookStart;

    newAudio.ontimeupdate = () => {
      if (newAudio.currentTime >= track.hookEnd) {
        newAudio.pause();
        setIsPlaying(false);
        setPlayingTrack(null);
      }
    };

    newAudio.play();
    setAudio(newAudio);
    setPlayingTrack(track);
    setIsPlaying(true);
  };

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col">

      {/* ── NAVBAR ────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-white/10">
        <h1 className="text-3xl text-[#90e0ef]" style={{ fontFamily: "cursive" }}>
          Hookify
        </h1>
        <a href="/home" className="text-gray-400 text-sm hover:text-white transition-colors">
          ← back to feed
        </a>
      </nav>

      {/* ── SEARCH BAR ──────────────────────────────────────────── */}
      <div className="px-6 py-8 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-medium text-center mb-2">
          find any hook 🎵
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          search any song — AI will detect the hook automatically!
        </p>

        {/* Search input */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="search any song or artist..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1 px-5 py-3 rounded-full bg-[#131929] border border-[#90e0ef]/20 text-white placeholder-gray-500 outline-none focus:border-[#90e0ef] transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-3 rounded-full bg-[#90e0ef] text-[#0a0e1a] font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "..." : "search"}
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <Image
              src="/Elephant_Beats.jpeg"
              alt="Loading"
              width={60}
              height={60}
              className="rounded-full border-2 border-[#90e0ef] animate-bounce mx-auto mb-4"
            />
            <p className="text-[#90e0ef] text-sm animate-pulse">
              🤖 AI is detecting hooks...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center mt-4">{error}</p>
        )}

        {/* ── SEARCH RESULTS ──────────────────────────────────── */}
        <AnimatePresence>
          {results.length > 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-col gap-3"
            >
              <p className="text-gray-400 text-sm text-center mb-2">
                {results.length} hooks found — tap to play!
              </p>

              {results.map((track) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`bg-gradient-to-r ${track.gradient} rounded-2xl p-4 border border-white/10 flex items-center gap-4 cursor-pointer hover:border-[#90e0ef]/40 transition-all`}
                  onClick={() => playHook(track)}
                >
                  {/* Album art */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={track.albumArt}
                      alt={track.album}
                      className={`w-14 h-14 rounded-full object-cover border-2 transition-all ${
                        playingTrack?.id === track.id && isPlaying
                          ? "border-[#90e0ef] animate-spin shadow-[0_0_15px_rgba(144,224,239,0.5)]"
                          : "border-white/20"
                      }`}
                      style={{ animationDuration: "4s" }}
                    />
                  </div>

                  {/* Song info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                    <p className="text-xs text-gray-600 truncate">{track.album}</p>
                  </div>

                  {/* Hook info + play button */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-xs text-[#90e0ef] bg-[#90e0ef]/10 px-2 py-1 rounded-full">
                      🤖 {track.hookStart}s–{track.hookEnd}s
                    </div>
                    <button className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                      playingTrack?.id === track.id && isPlaying
                        ? "bg-[#90e0ef] text-[#0a0e1a] shadow-[0_0_15px_rgba(144,224,239,0.5)]"
                        : "bg-white/10 text-white hover:bg-[#90e0ef]/20"
                    }`}>
                      {playingTrack?.id === track.id && isPlaying ? "⏸" : "▶"}
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