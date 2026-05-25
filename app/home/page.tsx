// app/home/page.tsx
// Main home page — TikTok swipe feed with REAL music from iTunes API
// Features: real audio, saved hooks, playlists, share, logout

"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { fetchAllHooks, type Track } from "@/lib/itunes";
import { supabase } from "@/lib/supabase";

// ── Type: Playlist ───────────────────────────────────────────────
type Playlist = {
  id: string;
  name: string;
};

export default function HomePage() {
  const [hooks, setHooks]               = useState<Track[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection]       = useState<"left" | "right" | null>(null);
  const [isVibing, setIsVibing]         = useState(false);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [activeTab, setActiveTab]       = useState("home");
  const [savedHooks, setSavedHooks]     = useState<number[]>([]);
  const [userId, setUserId]             = useState<string | null>(null);
  const [userEmail, setUserEmail]       = useState<string>("");
  const [playlists, setPlaylists]       = useState<Playlist[]>([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName]     = useState("");
  const [playlistMessage, setPlaylistMessage]     = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Fetch songs from iTunes ────────────────────────────────────
  useEffect(() => {
    async function fetchHooks() {
      setLoading(true);
      try {
        // Try to get real YouTube trending songs first
        const trendingResponse = await fetch("/api/trending");
        const trendingData     = await trendingResponse.json();

        if (trendingData.trending?.length > 0) {
          // Use YouTube trending songs — search iTunes for each
          const { searchTrack } = await import("@/lib/itunes");
          // Try each song — use cleanTitle only if full query fails
          const results = await Promise.all(
            trendingData.trending
              .slice(0, 15) // Try more songs to get 8 valid ones
              .map((song: any, i: number) => searchTrack(song.cleanTitle, i))
          );
          const validHooks = results.filter((t): t is Track => t !== null);
          
          if (validHooks.length >= 3) {
            setHooks(validHooks.slice(0, 8));
            setLoading(false);
            return;
          }
        }
      } catch {
        // YouTube failed — fall back to manual list
      }

      // Fallback to manual list
      const validHooks = await fetchAllHooks();
      setHooks(validHooks);
      setLoading(false);
    }
    fetchHooks();
  }, []);

  // ── Get logged in user + saved hooks + playlists ───────────────
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email ?? "");
        const { data: savedData } = await supabase
          .from("saved_hooks").select("track_id").eq("user_id", user.id);
        if (savedData) setSavedHooks(savedData.map((r) => r.track_id));
        const { data: playlistData } = await supabase
          .from("playlists").select("id, name").eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (playlistData) setPlaylists(playlistData);
      }
    }
    getUser();
  }, []);

  // ── Clean up audio ─────────────────────────────────────────────
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const currentHook = hooks[currentIndex];

  // ── Play / pause hook audio ────────────────────────────────────
  const togglePlay = () => {
    if (!currentHook?.previewUrl) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setIsVibing(false);
    } else {
      if (!audioRef.current || audioRef.current.src !== currentHook.previewUrl) {
        audioRef.current?.pause();
        audioRef.current = new Audio(currentHook.previewUrl);
        audioRef.current.currentTime = currentHook.hookStart;
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current && audioRef.current.currentTime >= currentHook.hookEnd) {
            audioRef.current.pause();
            audioRef.current.currentTime = currentHook.hookStart;
            setIsPlaying(false);
            setIsVibing(false);
          }
        };
        audioRef.current.onended = () => { setIsPlaying(false); setIsVibing(false); };
      } else {
        audioRef.current.currentTime = currentHook.hookStart;
      }
      audioRef.current.play();
      setIsPlaying(true);
      setIsVibing(true);

      // Track this play in database
      if (userId && currentHook) {
        supabase.from("hook_plays").insert({
          user_id:  userId,
          track_id: currentHook.id,
          title:    currentHook.title,
          artist:   currentHook.artist,
        });
      }
    }
  };

  // ── Swipe next ─────────────────────────────────────────────────
  const swipeNext = () => {
    if (currentIndex < hooks.length - 1) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setIsVibing(false);
      setDirection("left");
      setTimeout(() => { setCurrentIndex((p) => p + 1); setDirection(null); }, 300);
    }
  };

  // ── Swipe prev ─────────────────────────────────────────────────
  const swipePrev = () => {
    if (currentIndex > 0) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setIsVibing(false);
      setDirection("right");
      setTimeout(() => { setCurrentIndex((p) => p - 1); setDirection(null); }, 300);
    }
  };

  // ── Like / unlike ──────────────────────────────────────────────
  const toggleLike = async () => {
    if (!currentHook) return;
    const isLiked = savedHooks.includes(currentHook.id);
    setHooks((prev) => prev.map((h) => h.id === currentHook.id ? { ...h, liked: !h.liked } : h));
    setSavedHooks((prev) => isLiked ? prev.filter((id) => id !== currentHook.id) : [...prev, currentHook.id]);
    if (userId) {
      if (isLiked) {
        await supabase.from("saved_hooks").delete().eq("user_id", userId).eq("track_id", currentHook.id);
      } else {
        await supabase.from("saved_hooks").insert({
          user_id: userId, track_id: currentHook.id, title: currentHook.title,
          artist: currentHook.artist, album: currentHook.album, album_art: currentHook.albumArt,
          preview_url: currentHook.previewUrl, hook_start: currentHook.hookStart,
          hook_end: currentHook.hookEnd, gradient: currentHook.gradient,
        });
      }
    }
  };

  // ── Share ──────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!currentHook) return;
    const text = `🎵 Check out the hook of "${currentHook.title}" by ${currentHook.artist} on Hookify!`;
    if (navigator.share) {
      await navigator.share({ title: "Hookify", text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(text);
      alert("Link copied to clipboard!");
    }
  };

  // ── Create new playlist ────────────────────────────────────────
  const createPlaylist = async () => {
    if (!userId || !newPlaylistName.trim()) return;
    const { data, error } = await supabase
      .from("playlists")
      .insert({ user_id: userId, name: newPlaylistName.trim() })
      .select()
      .single();
    if (!error && data) {
      setPlaylists((prev) => [...prev, data]);
      setNewPlaylistName("");
      setPlaylistMessage(`"${data.name}" created! ✅`);
      // Force close modal after 1.5 seconds
      window.setTimeout(() => {
        setPlaylistMessage("");
        setShowPlaylistModal(false);
      }, 1500);
    } else {
      // If error, still close modal
      setShowPlaylistModal(false);
    }
  };

  // ── Add current hook to a playlist ────────────────────────────
  const addToPlaylist = async (playlistId: string, playlistName: string) => {
    if (!userId || !currentHook) return;
    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId, user_id: userId, track_id: currentHook.id,
      title: currentHook.title, artist: currentHook.artist, album: currentHook.album,
      album_art: currentHook.albumArt, preview_url: currentHook.previewUrl,
      hook_start: currentHook.hookStart, hook_end: currentHook.hookEnd,
      gradient: currentHook.gradient,
    });
    if (!error) {
      setPlaylistMessage(`Added to "${playlistName}"! ✅`);
      setTimeout(() => {
        setPlaylistMessage("");
        setShowPlaylistModal(false);
      }, 1500);
    }
  };

  // ── Delete playlist ────────────────────────────────────────────
  const deletePlaylist = async (playlistId: string) => {
    await supabase.from("playlists").delete().eq("id", playlistId);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  };

  // ── Loading screen ─────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col items-center justify-center gap-4">
        <Image src="/Elephant_Beats.jpeg" alt="Loading" width={80} height={80}
          className="rounded-full border-2 border-[#90e0ef] animate-bounce" />
        <p className="text-[#90e0ef] text-sm tracking-widest uppercase animate-pulse">
          fetching hooks...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col">

      {/* ── PLAYLIST MODAL ──────────────────────────────────────── */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[#0e2a3b] rounded-3xl p-6 w-full max-w-sm border border-[#90e0ef]/20">
            <h3 className="text-lg font-medium text-center mb-4 text-[#90e0ef]">
              add to playlist ➕
            </h3>
            {playlistMessage && (
              <p className="text-green-400 text-sm text-center mb-4">{playlistMessage}</p>
            )}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="new playlist name..."
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
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {playlists.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  no playlists yet — create one above!
                </p>
              ) : (
                playlists.map((playlist) => (
                  <button key={playlist.id}
                    onClick={() => addToPlaylist(playlist.id, playlist.name)}
                    className="w-full py-3 px-4 rounded-2xl bg-[#0a0e1a] border border-white/10 text-left text-sm hover:border-[#90e0ef]/40 transition-all flex items-center gap-3">
                    <span className="text-lg">🎵</span>
                    <span>{playlist.name}</span>
                  </button>
                ))
              )}
            </div>
            <button onClick={() => setShowPlaylistModal(false)}
              className="w-full mt-4 py-2 rounded-full border border-white/10 text-gray-400 text-sm hover:bg-white/5">
              cancel
            </button>
          </div>
        </div>
      )}

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-4">
        <h1 className="text-3xl text-[#90e0ef]" style={{ fontFamily: "cursive" }}>Hookify</h1>
        <div className="relative cursor-pointer" onClick={togglePlay}>
          <Image src="/Elephant_Beats.jpeg" alt="Hookify mascot" width={50} height={50}
            className={`rounded-full border-2 border-[#90e0ef] transition-all duration-300 ${
              isVibing ? "animate-bounce scale-110 shadow-[0_0_20px_rgba(144,224,239,0.7)]" : "hover:scale-110"
            }`}
          />
          {isVibing && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-[#0a0e1a] animate-pulse" />
          )}
        </div>
      </nav>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start px-2 pt-2 pb-4">

        {/* ══ HOME TAB ════════════════════════════════════════════ */}
        {activeTab === "home" && currentHook && (
          <div className="w-full max-w-4xl">
            <div className="flex gap-2 justify-center mb-4">
              {hooks.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentIndex ? "w-8 bg-[#90e0ef]" : "w-2 bg-white/20"
                }`} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentHook.id}
                initial={{ opacity: 0, x: direction === "left" ? 400 : -400 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction === "left" ? -400 : 400 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) swipeNext();
                  else if (info.offset.x > 80) swipePrev();
                }}
                className={`bg-gradient-to-br ${currentHook.gradient} rounded-3xl p-8 border border-white/10 cursor-grab active:cursor-grabbing flex flex-col justify-between min-h-[78vh]`}
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}
              >
                {/* Vinyl */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className={`w-80 h-80 rounded-full border-2 border-[#90e0ef]/30 flex items-center justify-center ${isPlaying ? "animate-spin" : ""}`}
                      style={{ animationDuration: "4s" }}>
                      <div className="w-72 h-72 rounded-full border border-white/10 flex items-center justify-center overflow-hidden"
                        style={{ background: "radial-gradient(circle, #1a1a2e 30%, #0d0d1a 60%, #1a1a2e 80%)" }}>
                        <div className="w-60 h-60 rounded-full border border-white/5 flex items-center justify-center">
                          <div className="w-48 h-48 rounded-full border border-white/5 flex items-center justify-center">
                            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#90e0ef]/50 shadow-[0_0_20px_rgba(144,224,239,0.3)]">
                              <img src={currentHook.albumArt} alt={currentHook.album} className="w-full h-full object-cover" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0a0e1a] border border-white/20" />
                  </div>
                </div>

                {/* Song info */}
                <div className="text-center mb-4">
                  <h2 className="text-3xl font-medium mb-1">{currentHook.title}</h2>
                  <p className="text-[#90e0ef] text-base mb-0.5">{currentHook.artist}</p>
                  <p className="text-gray-500 text-sm">{currentHook.album}</p>
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">duration</p>
                    <p className="text-base text-[#90e0ef] font-medium">0:30</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">source</p>
                    <p className="text-base text-[#90e0ef] font-medium">iTunes</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">hook</p>
                    <p className="text-base text-[#90e0ef] font-medium">#{currentIndex + 1}</p>
                  </div>
                </div>

                {/* Play button */}
                <div className="flex justify-center mb-6">
                  <button onClick={togglePlay}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${
                      isPlaying
                        ? "bg-[#90e0ef] text-[#0a0e1a] scale-110 shadow-[0_0_30px_rgba(144,224,239,0.6)]"
                        : "bg-white/10 text-white hover:bg-[#90e0ef]/20 border border-white/20"
                    }`}>
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex justify-around items-center">
                  <button onClick={toggleLike} className="flex flex-col items-center gap-1 group">
                    <span className={`text-3xl transition-transform duration-200 group-hover:scale-125 ${
                      savedHooks.includes(currentHook.id) ? "text-red-400" : "text-gray-400"
                    }`}>
                      {savedHooks.includes(currentHook.id) ? "❤️" : "🤍"}
                    </span>
                    <span className="text-xs text-gray-500">save</span>
                  </button>

                  <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                    <span className="text-3xl text-gray-400 group-hover:scale-125 transition-transform">📤</span>
                    <span className="text-xs text-gray-500">share</span>
                  </button>

                  <button onClick={() => setShowPlaylistModal(true)} className="flex flex-col items-center gap-1 group">
                    <span className="text-3xl text-gray-400 group-hover:scale-125 transition-transform">➕</span>
                    <span className="text-xs text-gray-500">playlist</span>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
            <p className="text-center text-gray-600 text-xs mt-3">← drag to swipe hooks →</p>
          </div>
        )}

        {/* ══ SAVED TAB ═══════════════════════════════════════════ */}
        {activeTab === "saved" && (
          <div className="w-full max-w-2xl">
            <h2 className="text-xl font-medium mb-6 text-center text-[#90e0ef]">your saved hooks 💾</h2>
            {savedHooks.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🐘</p>
                <p className="text-gray-400 text-sm">no saved hooks yet!</p>
                <p className="text-gray-600 text-xs mt-1">tap the heart on any hook to save it</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {hooks.filter((h) => savedHooks.includes(h.id)).map((hook) => (
                  <div key={hook.id} className={`bg-gradient-to-r ${hook.gradient} rounded-2xl p-4 border border-white/10 flex items-center gap-4`}>
                    <img src={hook.albumArt} alt={hook.album} className="w-14 h-14 rounded-full object-cover border border-[#90e0ef]/30" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{hook.title}</p>
                      <p className="text-sm text-gray-400 truncate">{hook.artist}</p>
                    </div>
                    <span className="text-sm text-[#90e0ef] bg-[#90e0ef]/10 px-3 py-1 rounded-full">0:30</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TRENDING TAB ════════════════════════════════════════ */}
        {activeTab === "trending" && (
          <div className="w-full max-w-2xl">
            <h2 className="text-xl font-medium mb-6 text-center text-[#90e0ef]">🔥 viral this week</h2>
            <div className="flex flex-col">
              {hooks.map((hook, index) => (
                <div key={hook.id}
                  className="flex items-center gap-4 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 px-3 rounded-xl transition-all"
                  onClick={() => { setCurrentIndex(index); setActiveTab("home"); }}>
                  <span className="text-gray-600 text-sm w-5">{index + 1}</span>
                  <img src={hook.albumArt} alt={hook.album} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{hook.title}</p>
                    <p className="text-sm text-gray-400 truncate">{hook.artist}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    index === 0 ? "bg-red-500/15 text-red-400" :
                    index === 1 ? "bg-[#90e0ef]/15 text-[#90e0ef]" :
                    "bg-green-500/15 text-green-400"
                  }`}>
                    {index === 0 ? "hot" : index === 1 ? "viral" : "new"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PLAYLISTS TAB ═══════════════════════════════════════ */}
        {activeTab === "playlists" && (
          <div className="w-full max-w-2xl">
            <h2 className="text-xl font-medium mb-6 text-center text-[#90e0ef]">
              your playlists 🎵
            </h2>
            {playlists.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🎵</p>
                <p className="text-gray-400 text-sm">no playlists yet!</p>
                <p className="text-gray-600 text-xs mt-1">tap ➕ on any hook to create one</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {playlists.map((playlist) => (
                  <div key={playlist.id}
                    className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-4 border border-white/10 hover:border-[#90e0ef]/30 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-[#90e0ef]/20 border border-[#90e0ef]/30 flex items-center justify-center text-xl flex-shrink-0">
                      🎵
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{playlist.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">your playlist</p>
                    </div>
                    <button
                      onClick={() => deletePlaylist(playlist.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors text-lg">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ PROFILE TAB ═════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="w-full max-w-2xl text-center">
            <Image src="/Elephant_Beats.jpeg" alt="Profile" width={90} height={90}
              className="rounded-full border-2 border-[#90e0ef] mx-auto mb-4 shadow-[0_0_20px_rgba(144,224,239,0.4)]" />
            <h2 className="text-xl font-medium mb-1">{userEmail || "hook listener"}</h2>
            <p className="text-gray-400 text-sm mb-8">hook listener 🎧</p>
            <div className="flex justify-center gap-8 mb-8">
              <div>
                <p className="text-2xl font-medium text-[#90e0ef]">{savedHooks.length}</p>
                <p className="text-xs text-gray-400">saved</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-[#90e0ef]">{playlists.length}</p>
                <p className="text-xs text-gray-400">playlists</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-[#90e0ef]">{hooks.length}</p>
                <p className="text-xs text-gray-400">hooks</p>
              </div>
            </div>
            <button
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login"; }}
              className="w-64 py-3 rounded-full border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-all">
              logout
            </button>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────── */}
      <nav className="flex justify-around items-center px-6 py-4 border-t border-white/10 bg-[#0a0e1a]">
        {[
          { id: "home",      icon: "🏠", label: "home",      href: null        },
          { id: "trending",  icon: "🔥", label: "trending",  href: null        },
          { id: "saved",     icon: "💾", label: "saved",     href: null        },
          { id: "search",    icon: "🔍", label: "search",    href: "/search"   },
          { id: "playlists", icon: "🎵", label: "playlists", href: null        },
          { id: "profile",   icon: "👤", label: "profile",   href: null        },
        ].map((tab) => (
          <button key={tab.id}
            onClick={() => tab.href ? window.location.href = tab.href : setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              activeTab === tab.id ? "text-[#90e0ef] scale-110" : "text-gray-500 hover:text-gray-300"
            }`}>
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </nav>

    </main>
  );
}