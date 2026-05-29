"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { type Track } from "@/lib/itunes";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

const GRADIENTS = [
  "from-[#1a0533] via-[#2d1b69] to-[#0d1b2a]",
  "from-[#0d2137] via-[#1a3a4a] to-[#0a1628]",
  "from-[#1a0a2e] via-[#2d0a3a] to-[#0d1a1a]",
  "from-[#2a1a0d] via-[#3d2510] to-[#1a0d05]",
  "from-[#0d1a2a] via-[#1a2d3a] to-[#0a1520]",
];

type SearchTrack = Track & { aiDetecting?: boolean };
type Playlist = { id: string; name: string };

export default function SearchPage() {
  const [query, setQuery]                         = useState("");
  const [results, setResults]                     = useState<SearchTrack[]>([]);
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState("");
  const [selectedTrack, setSelectedTrack]         = useState<SearchTrack | null>(null);
  const [isPlaying, setIsPlaying]                 = useState(false);
  const [isLooping, setIsLooping]                 = useState(false);
  const [audio, setAudio]                         = useState<HTMLAudioElement | null>(null);
  const isLoopingRef = useRef(false);
  const [userId, setUserId]                       = useState<string | null>(null);
  const [playlists, setPlaylists]                 = useState<Playlist[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName]     = useState("");
  const [playlistMessage, setPlaylistMessage]     = useState("");
  const [savedTracks, setSavedTracks]             = useState<Set<number>>(new Set());
  const [mounted, setMounted]                     = useState(false);
  const [recentSearches, setRecentSearches]       = useState<string[]>([]);

  useEffect(() => { setMounted(true); }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("hookify_recent_searches");
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from("playlists").select("id, name").eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (data) setPlaylists(data);
        const { data: saved } = await supabase
          .from("saved_hooks").select("track_id").eq("user_id", user.id);
        if (saved) setSavedTracks(new Set(saved.map((r: any) => Number(r.track_id))));
      }
    }
    loadUser();
  }, []);

  const saveToHistory = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem("hookify_recent_searches", JSON.stringify(updated));
  };

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    if (overrideQuery) setQuery(overrideQuery);
    setLoading(true);
    setError("");
    setResults([]);
    saveToHistory(q);
    audio?.pause();
    setIsPlaying(false);
    setSelectedTrack(null);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      if (!data.results?.length) { setError("No songs found!"); setLoading(false); return; }
      const initialTracks: SearchTrack[] = data.results
        .filter((t: any) => t.previewUrl)
        .slice(0, 8)
        .map((track: any, i: number) => ({
          id:         track.trackId,
          title:      track.trackName      ?? "Unknown Title",
          artist:     track.artistName     ?? "Unknown Artist",
          album:      track.collectionName ?? track.trackName ?? "Single",
          albumArt:   track.artworkUrl100?.replace("100x100", "400x400") ?? "",
          previewUrl: track.previewUrl,
          hookStart: 5, hookEnd: 20,
          gradient: GRADIENTS[i % GRADIENTS.length], liked: false, aiDetecting: true,
        }));
      setResults(initialTracks);
      setLoading(false);
      initialTracks.forEach(async (track) => {
        try {
          const aiResponse = await fetch("/api/detect-hook", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ previewUrl: track.previewUrl }),
          });
          const aiResult = await aiResponse.json();
          if (aiResult.success) {
            setResults((prev) => prev.map((t) => t.id === track.id
              ? { ...t, hookStart: aiResult.hook_start, hookEnd: aiResult.hook_end, aiDetecting: false } : t));
            setSelectedTrack((prev) => prev?.id === track.id
              ? { ...prev, hookStart: aiResult.hook_start, hookEnd: aiResult.hook_end, aiDetecting: false } : prev);
          } else {
            setResults((prev) => prev.map((t) => t.id === track.id ? { ...t, aiDetecting: false } : t));
          }
        } catch {
          setResults((prev) => prev.map((t) => t.id === track.id ? { ...t, aiDetecting: false } : t));
        }
      });
    } catch { setError("Something went wrong!"); setLoading(false); }
  };

  const openCard = (track: SearchTrack) => { audio?.pause(); setIsPlaying(false); setSelectedTrack(track); };

  const togglePlay = async (track: SearchTrack) => {
    if (!track.previewUrl) return;
    // If the same track is already playing, pause it
    if (audio && audio.src === track.previewUrl && isPlaying) {
      audio.pause(); setIsPlaying(false); return;
    }
    // Stop any currently playing audio before starting the new track
    if (audio) { audio.pause(); }
    const newAudio = new Audio(track.previewUrl);
    newAudio.currentTime = track.hookStart;
    newAudio.ontimeupdate = () => {
      if (newAudio.currentTime >= track.hookEnd) {
        if (isLoopingRef.current) { newAudio.currentTime = track.hookStart; }
        else { newAudio.pause(); setIsPlaying(false); }
      }
    };
    newAudio.onended = () => setIsPlaying(false);
    newAudio.play();
    setAudio(newAudio);
    setIsPlaying(true);
    const { data: { session: ps } } = await supabase.auth.getSession();
    if (ps?.user) {
      supabase.from("hook_plays").insert({
        user_id: ps.user.id, user_email: ps.user.email,
        track_id: track.id, title: track.title, artist: track.artist,
      });
    }
  };

  const closeCard = () => { audio?.pause(); setIsPlaying(false); setSelectedTrack(null); };

  const handleSave = async (track: SearchTrack) => {
    // Fetch session fresh if userId not loaded
    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUserId = session?.user?.id ?? null;
      if (activeUserId) setUserId(activeUserId);
    }
    if (!activeUserId || savedTracks.has(track.id)) return;
    const { error } = await supabase.from("saved_hooks").insert({
      user_id: activeUserId, track_id: track.id, title: track.title,
      artist: track.artist, album: track.album, album_art: track.albumArt,
      preview_url: track.previewUrl, hook_start: Math.round(track.hookStart),
      hook_end: Math.round(track.hookEnd), gradient: track.gradient,
    });
    if (!error) {
      setSavedTracks((prev) => new Set([...prev, track.id]));
      setPlaylistMessage("Hook saved! ❤️");
      setTimeout(() => setPlaylistMessage(""), 1500);
    }
  };

  const handleShare = async (track: SearchTrack) => {
    const params = new URLSearchParams({
      title:  track.title,
      artist: track.artist,
      art:    track.albumArt,
      url:    track.previewUrl,
      start:  String(track.hookStart),
      end:    String(track.hookEnd),
    });
    const shareUrl = `${window.location.origin}/share/${track.id}?${params.toString()}`;
    const text = `🎵 "${track.title}" by ${track.artist} — just the hook on Hookify!`;
    if (navigator.share) {
      await navigator.share({ title: "Hookify Hook", text, url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setPlaylistMessage("Hook link copied! 📤");
      setTimeout(() => setPlaylistMessage(""), 1500);
    }
  };

  const createPlaylist = async () => {
    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUserId = session?.user?.id ?? null;
      if (activeUserId) setUserId(activeUserId);
    }
    if (!activeUserId || !newPlaylistName.trim()) return;
    const { data: newPL, error: err } = await supabase
      .from("playlists")
      .insert({ user_id: activeUserId, name: newPlaylistName.trim() })
      .select().single();
    if (!err && newPL) {
      setPlaylists((prev) => [...prev, newPL]);
      setNewPlaylistName("");
      setPlaylistMessage(`"${newPL.name}" created! ✅`);
    } else {
      setPlaylistMessage("Error 😕");
    }
    window.setTimeout(() => { setPlaylistMessage(""); setShowPlaylistModal(false); }, 1500);
  };

  const addToPlaylist = async (playlistId: string, playlistName: string) => {
    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUserId = session?.user?.id ?? null;
      if (activeUserId) setUserId(activeUserId);
    }
    if (!activeUserId || !selectedTrack) {
      setPlaylistMessage("Not logged in — please reload 😕");
      setTimeout(() => setPlaylistMessage(""), 2500);
      return;
    }
    // Duplicate check (ignore maybeSingle error — just let insert handle it)
    const { data: existing } = await supabase
      .from("playlist_tracks")
      .select("id")
      .eq("playlist_id", playlistId)
      .eq("track_id", Number(selectedTrack.id))
      .maybeSingle();
    if (existing) {
      setPlaylistMessage(`Already in "${playlistName}"! 🎵`);
      window.setTimeout(() => { setPlaylistMessage(""); setShowPlaylistModal(false); }, 1500);
      return;
    }
    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id:  playlistId,
      user_id:      activeUserId,
      track_id:     Number(selectedTrack.id),
      title:        selectedTrack.title        ?? "",
      artist:       selectedTrack.artist       ?? "",
      album:        selectedTrack.album        ?? "Single",
      album_art:    selectedTrack.albumArt     ?? "",
      preview_url:  selectedTrack.previewUrl   ?? "",
      hook_start:   Math.round(selectedTrack.hookStart),
      hook_end:     Math.round(selectedTrack.hookEnd),
      gradient:     selectedTrack.gradient     ?? "",
    });
    if (!error) {
      setPlaylists((prev) => prev.map((p) =>
        p.id === playlistId ? { ...p } : p
      ));
      setPlaylistMessage(`Added to "${playlistName}"! ✅`);
      window.setTimeout(() => { setPlaylistMessage(""); setShowPlaylistModal(false); }, 1500);
    } else {
      console.error("addToPlaylist error:", error);
      setPlaylistMessage(`Couldn't add: ${error.message}`);
      window.setTimeout(() => setPlaylistMessage(""), 3000);
    }
  };

  const playlistModal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.8)" }}>
      <div className="bg-[#0e2a3b] rounded-3xl p-6 w-full max-w-sm border border-[#90e0ef]/20">
        <h3 className="text-lg font-medium text-center mb-4 text-[#90e0ef]">add to playlist ➕</h3>
        {playlistMessage && <p className="text-green-400 text-sm text-center mb-4">{playlistMessage}</p>}
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="new playlist name..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
            className="flex-1 px-4 py-2 rounded-full bg-[#0a0e1a] border border-[#90e0ef]/30 text-white text-sm outline-none focus:border-[#90e0ef]"
          />
          <button onClick={createPlaylist}
            className="px-4 py-2 rounded-full bg-[#90e0ef] text-[#0a0e1a] text-sm font-bold hover:opacity-90">
            create
          </button>
        </div>
        <div className="flex flex-col gap-2 max-h-48 scroll-touch">
          {playlists.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">no playlists yet — create one above!</p>
          ) : (
            playlists.map((p) => (
              <button key={p.id} onClick={() => addToPlaylist(p.id, p.name)}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-[#90e0ef]/20 text-white text-left text-sm hover:bg-white/10 hover:border-[#90e0ef]/50 transition-all flex items-center gap-3">
                <span>🎵</span><span>{p.name}</span>
              </button>
            ))
          )}
        </div>
        <button onClick={() => { setShowPlaylistModal(false); setNewPlaylistName(""); setPlaylistMessage(""); }}
          className="w-full mt-4 py-2 rounded-full border border-white/10 text-gray-400 text-sm hover:bg-white/5">
          cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      {mounted && showPlaylistModal && createPortal(playlistModal, document.body)}

      <main className="h-dvh bg-[#0a0e1a] text-white flex flex-col overflow-hidden">
        <AnimatePresence>
          {selectedTrack && (
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              drag={showPlaylistModal ? false : "y"}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.3}
              dragMomentum={false}
              style={{ pointerEvents: showPlaylistModal ? "none" : undefined }}
              onDragEnd={(_, info) => {
                if (showPlaylistModal) return;
                const currentIdx = results.findIndex((t) => t.id === selectedTrack?.id);
                if (info.offset.y < -50 || info.velocity.y < -200) {
                  if (currentIdx < results.length - 1) { audio?.pause(); setIsPlaying(false); setSelectedTrack(results[currentIdx + 1]); }
                } else if (info.offset.y > 50 || info.velocity.y > 200) {
                  if (currentIdx > 0) { audio?.pause(); setIsPlaying(false); setSelectedTrack(results[currentIdx - 1]); }
                  else { closeCard(); }
                }
              }}
              className="fixed inset-0 z-50 bg-[#0a0e1a] flex flex-col swipe-card"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <button onClick={closeCard}
                  className="flex items-center gap-2 text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  ← back
                </button>
                <div className="flex items-center gap-2">
                  {selectedTrack.aiDetecting
                    ? <span className="text-yellow-400 text-xs animate-pulse">🤖 finding hook...</span>
                    : <span className="text-xs text-[#90e0ef] bg-[#90e0ef]/10 px-3 py-1 rounded-full">🤖 {selectedTrack.hookStart}s – {selectedTrack.hookEnd}s</span>
                  }
                </div>
              </div>

              {/* Card body */}
              <div className={`flex-1 flex flex-col items-center justify-center px-6 py-4 bg-gradient-to-b ${selectedTrack.gradient} scroll-touch`}>
                {/* Vinyl */}
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full border-2 border-[#90e0ef]/30 flex items-center justify-center ${isPlaying ? "animate-spin" : ""}`}
                      style={{ animationDuration: "4s" }}>
                      <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full border border-white/10 flex items-center justify-center overflow-hidden"
                        style={{ background: "radial-gradient(circle, #1a1a2e 30%, #0d0d1a 60%, #1a1a2e 80%)" }}>
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-white/5 flex items-center justify-center">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#90e0ef]/50 shadow-[0_0_20px_rgba(144,224,239,0.3)]">
                            <img src={selectedTrack.albumArt} alt={selectedTrack.album} className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0a0e1a] border border-white/20" />
                  </div>
                </div>

                {/* Song info */}
                <div className="text-center mb-5 w-full px-2">
                  <h2 className="text-xl sm:text-2xl font-medium mb-1 truncate">{selectedTrack.title}</h2>
                  <p className="text-[#90e0ef] text-sm sm:text-base mb-0.5 truncate">{selectedTrack.artist}</p>
                  <p className="text-gray-500 text-xs sm:text-sm truncate">{selectedTrack.album}</p>
                </div>

                {/* Play button */}
                <div className="flex justify-center mb-4">
                  <button onClick={() => togglePlay(selectedTrack)}
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300 ${
                      isPlaying ? "bg-[#90e0ef] text-[#0a0e1a] scale-110 shadow-[0_0_30px_rgba(144,224,239,0.6)]" : "bg-white/10 text-white hover:bg-[#90e0ef]/20 border border-white/20"
                    }`}>
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                </div>

                {/* Loop toggle */}
                <button onClick={() => setIsLooping((p) => { isLoopingRef.current = !p; return !p; })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all mb-5 ${
                    isLooping ? "bg-[#90e0ef] text-[#0a0e1a] font-bold" : "bg-white/10 text-gray-400 hover:bg-white/20"
                  }`}>
                  🔁 {isLooping ? "loop on" : "loop off"}
                </button>

                {/* Action buttons */}
                <div className="flex justify-around items-center w-full max-w-xs">
                  <button onClick={() => handleSave(selectedTrack)} className="flex flex-col items-center gap-1 group">
                    <span className="text-2xl group-hover:scale-125 transition-transform">{savedTracks.has(selectedTrack.id) ? "❤️" : "🤍"}</span>
                    <span className="text-xs text-gray-500">{savedTracks.has(selectedTrack.id) ? "saved" : "save"}</span>
                  </button>
                  <button onClick={() => handleShare(selectedTrack)} className="flex flex-col items-center gap-1 group">
                    <span className="text-2xl text-gray-400 group-hover:scale-125 transition-transform">📤</span>
                    <span className="text-xs text-gray-500">share</span>
                  </button>
                  <button onClick={() => setShowPlaylistModal(true)} className="flex flex-col items-center gap-1 group">
                    <span className="text-2xl text-gray-400 group-hover:scale-125 transition-transform">➕</span>
                    <span className="text-xs text-gray-500">playlist</span>
                  </button>
                </div>

                {/* Feedback toast */}
                {playlistMessage && (
                  <p className="text-green-400 text-sm text-center mt-4 animate-pulse">{playlistMessage}</p>
                )}

                {/* Swipe hint */}
                <p className="text-gray-600 text-xs mt-5 text-center">↑ swipe up for next · ↓ swipe down for previous</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <a href="/home">
              <h1 className="text-2xl text-[#90e0ef] cursor-pointer hover:opacity-80" style={{ fontFamily: "cursive" }}>Hookify</h1>
            </a>
            <a href="/home"
              className="flex items-center gap-1 text-gray-400 text-sm hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full">
              ← home
            </a>
          </div>
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex gap-2">
              <input type="text" placeholder="search any song or artist..."
                value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(undefined)}
                autoFocus
                className="flex-1 px-5 py-3 rounded-full bg-[#131929] border border-[#90e0ef]/20 text-white placeholder-gray-500 outline-none focus:border-[#90e0ef] text-sm transition-colors"
              />
              <button onClick={() => handleSearch(undefined)} disabled={loading}
                className="px-5 py-3 rounded-full bg-[#90e0ef] text-[#0a0e1a] font-bold text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                {loading ? "⏳" : "search"}
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-2 px-2">{error}</p>}
          </div>
        </div>

        <div className="flex-1 px-6 max-w-2xl mx-auto w-full pb-8">
          {/* Loading state */}
          {loading && (
            <div className="text-center py-12">
              <Image src="/Elephant_Beats.jpeg" alt="Loading" width={60} height={60}
                className="rounded-full border-2 border-[#90e0ef] animate-bounce mx-auto mb-4" />
              <p className="text-[#90e0ef] text-sm animate-pulse">searching for hooks...</p>
            </div>
          )}

          {/* Empty / welcome state + recent searches */}
          {!loading && results.length === 0 && !error && (
            <div className="pt-4">
              {recentSearches.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">recent searches</p>
                    <button
                      onClick={() => { setRecentSearches([]); localStorage.removeItem("hookify_recent_searches"); }}
                      className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
                      clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {recentSearches.map((s) => (
                      <button key={s}
                        onClick={() => handleSearch(s)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 hover:bg-white/10 hover:border-[#90e0ef]/30 transition-all active:scale-95">
                        <span className="text-gray-500 text-xs">⏱</span> {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">🎵</p>
                  <p className="text-gray-300 text-base font-medium mb-2">search any song</p>
                  <p className="text-gray-500 text-sm">type a song name or artist and hit search</p>
                  <p className="text-gray-600 text-xs mt-2">AI will find the hook in seconds 🤖</p>
                </div>
              )}
            </div>
          )}

          <AnimatePresence>
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3 pt-4">
                <p className="text-gray-500 text-xs mb-1">{results.length} results — tap any to play the hook</p>
                {results.map((track, idx) => (
                  <motion.div key={track.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => openCard(track)}
                    className={`bg-gradient-to-r ${track.gradient} rounded-2xl p-4 border border-white/10 flex items-center gap-3 cursor-pointer hover:border-[#90e0ef]/50 hover:shadow-[0_0_12px_rgba(144,224,239,0.15)] transition-all active:scale-[0.98]`}>
                    <img src={track.albumArt} alt={track.album} className="w-12 h-12 rounded-full object-cover border-2 border-white/20 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{track.title}</p>
                      <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                      <div className="mt-1">
                        {track.aiDetecting
                          ? <span className="text-xs text-yellow-400 animate-pulse">🤖 detecting...</span>
                          : <span className="text-xs text-[#90e0ef]">🤖 {track.hookStart}s–{track.hookEnd}s</span>
                        }
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-base">{savedTracks.has(track.id) ? "❤️" : "🤍"}</span>
                      <span className="text-gray-500 text-lg">›</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}