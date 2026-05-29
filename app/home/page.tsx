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
  const [isLooping, setIsLooping] = useState(false); // Loop the hook
  const [newPlaylistName, setNewPlaylistName]     = useState("");
  const [playlistMessage, setPlaylistMessage]     = useState("");
  const [openPlaylist, setOpenPlaylist]       = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks]   = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks]     = useState(false);
  const [savedHooksFull, setSavedHooksFull]   = useState<any[]>([]);
  const [totalPlays, setTotalPlays]           = useState<number>(0);
  const [savedAudio, setSavedAudio]           = useState<HTMLAudioElement | null>(null);
  const [savedPlayingUrl, setSavedPlayingUrl] = useState<string | null>(null);
  const [shareToast, setShareToast]           = useState("");
  const [playlistCounts, setPlaylistCounts]   = useState<Record<string, number>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isLoopingRef = useRef(false);
  const playlistTracksRef = useRef<any[]>([]);
  const startPlaylistTrack = useRef<(index: number) => void>(() => {});
  const [isPlaylistMode, setIsPlaylistMode]           = useState(false);
  const [playlistModeIndex, setPlaylistModeIndex]     = useState(0);
  const [playingPlaylistTrackId, setPlayingPlaylistTrackId] = useState<string | null>(null);
  const [playlistMenuId, setPlaylistMenuId] = useState<string | null>(null);
  const [showAddToPlaylistSearch, setShowAddToPlaylistSearch] = useState(false);
  const [addSearchQuery, setAddSearchQuery]   = useState("");
  const [addSearchResults, setAddSearchResults] = useState<any[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [previewAudio, setPreviewAudio]         = useState<HTMLAudioElement | null>(null);
  const [previewingTrackId, setPreviewingTrackId] = useState<number | null>(null);

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

        // Saved track IDs (for liked heart on feed)
        const { data: savedData } = await supabase
          .from("saved_hooks")
          .select("track_id")
          .eq("user_id", user.id);
        if (savedData) setSavedHooks(savedData.map((r) => r.track_id));

        // Full saved hook rows (for Saved tab)
        const { data: savedFull } = await supabase
          .from("saved_hooks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (savedFull) setSavedHooksFull(savedFull);

        // Total play count for profile
        const { count: playsCount } = await supabase
          .from("hook_plays")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        setTotalPlays(playsCount ?? 0);

        const { data: playlistData } = await supabase
          .from("playlists").select("id, name").eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (playlistData) {
          setPlaylists(playlistData);
          // Load track counts for each playlist
          const counts: Record<string, number> = {};
          await Promise.all(playlistData.map(async (pl) => {
            const { count } = await supabase
              .from("playlist_tracks")
              .select("*", { count: "exact", head: true })
              .eq("playlist_id", pl.id);
            counts[pl.id] = count ?? 0;
          }));
          setPlaylistCounts(counts);
        }
      }
    }
    getUser();
  }, []);

  // ── Sync loop + playlist refs ──────────────────────────────────
  useEffect(() => { isLoopingRef.current = isLooping; }, [isLooping]);
  useEffect(() => { playlistTracksRef.current = playlistTracks; }, [playlistTracks]);

  // ── startPlaylistTrack (always latest via ref) ─────────────────
  startPlaylistTrack.current = (index: number) => {
    const tracks = playlistTracksRef.current;
    const track = tracks[index];
    if (!track) return;
    audioRef.current?.pause();
    const a = new Audio(track.preview_url);
    a.currentTime = track.hook_start;
    a.ontimeupdate = () => {
      if (a.currentTime >= track.hook_end) {
        a.pause();
        setPlayingPlaylistTrackId(null);
        setIsVibing(false);
        const next = index + 1;
        if (next < tracks.length) {
          setPlaylistModeIndex(next);
          setTimeout(() => startPlaylistTrack.current(next), 700);
        } else {
          setIsPlaylistMode(false);
          setPlaylistModeIndex(0);
        }
      }
    };
    a.play().catch(() => {});
    audioRef.current = a;
    setPlayingPlaylistTrackId(track.id);
    setPlaylistModeIndex(index);
    setIsVibing(true);
  };

  // ── Clean up audio ─────────────────────────────────────────────-
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
            if (isLoopingRef.current) {
              audioRef.current.currentTime = currentHook.hookStart;
            } else {
              audioRef.current.pause();
              audioRef.current.currentTime = currentHook.hookStart;
              setIsPlaying(false);
              setIsVibing(false);
            }
          }
        };
        audioRef.current.onended = () => { setIsPlaying(false); setIsVibing(false); };
      } else {
        audioRef.current.currentTime = currentHook.hookStart;
      }
      audioRef.current.play();
      setIsPlaying(true);
      setIsVibing(true);

      // ── Track this play in database ───────────────────────────
      if (userId && currentHook) {
        supabase.from("hook_plays").insert({
          user_id:    userId,
          user_email: userEmail,
          track_id:   currentHook.id,
          title:      currentHook.title,
          artist:     currentHook.artist,
        }).then(({ error }) => {
          if (error) console.error("Play tracking error:", error);
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
    if (isLiked) {
      setSavedHooksFull((prev) => prev.filter((h) => Number(h.track_id) !== currentHook.id));
    } else {
      const newRow = {
        track_id: currentHook.id, title: currentHook.title,
        artist: currentHook.artist, album: currentHook.album, album_art: currentHook.albumArt,
        preview_url: currentHook.previewUrl, hook_start: Math.round(currentHook.hookStart),
        hook_end: Math.round(currentHook.hookEnd), gradient: currentHook.gradient,
        created_at: new Date().toISOString(),
      };
      setSavedHooksFull((prev) => [newRow, ...prev]);
    }
    if (userId) {
      if (isLiked) {
        await supabase.from("saved_hooks").delete().eq("user_id", userId).eq("track_id", currentHook.id);
      } else {
        await supabase.from("saved_hooks").insert({
          user_id: userId, track_id: currentHook.id, title: currentHook.title,
          artist: currentHook.artist, album: currentHook.album, album_art: currentHook.albumArt,
          preview_url: currentHook.previewUrl, hook_start: Math.round(currentHook.hookStart),
          hook_end: Math.round(currentHook.hookEnd), gradient: currentHook.gradient,
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
      setShareToast("Link copied! 📤");
      setTimeout(() => setShareToast(""), 2000);
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
      setPlaylistCounts((prev) => ({ ...prev, [data.id]: 0 }));
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
    // Re-fetch session if userId not yet loaded (race condition on mount)
    let activeUserId = userId;
    if (!activeUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUserId = session?.user?.id ?? null;
      if (activeUserId) setUserId(activeUserId);
    }
    if (!activeUserId || !currentHook) {
      setPlaylistMessage("Not logged in — please reload 😕");
      setTimeout(() => setPlaylistMessage(""), 2500);
      return;
    }
    // Duplicate check
    const { data: existing } = await supabase
      .from("playlist_tracks")
      .select("id")
      .eq("playlist_id", playlistId)
      .eq("track_id", Number(currentHook.id))
      .maybeSingle();
    if (existing) {
      setPlaylistMessage(`Already in "${playlistName}"! 🎵`);
      setTimeout(() => { setPlaylistMessage(""); setShowPlaylistModal(false); }, 1500);
      return;
    }
    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id:  playlistId,
      user_id:      activeUserId,
      track_id:     Number(currentHook.id),
      title:        currentHook.title      ?? "",
      artist:       currentHook.artist     ?? "",
      album:        currentHook.album      ?? "Single",
      album_art:    currentHook.albumArt   ?? "",
      preview_url:  currentHook.previewUrl ?? "",
      hook_start:   Math.round(currentHook.hookStart),
      hook_end:     Math.round(currentHook.hookEnd),
      gradient:     currentHook.gradient   ?? "",
    });
    if (error) {
      console.error("addToPlaylist error:", error);
      setPlaylistMessage(`Couldn't add: ${error.message}`);
      setTimeout(() => setPlaylistMessage(""), 3000);
      return;
    }
    setPlaylistCounts((prev) => ({ ...prev, [playlistId]: (prev[playlistId] ?? 0) + 1 }));
    setPlaylistMessage(`Added to "${playlistName}"! ✅`);
    setTimeout(() => {
      setPlaylistMessage("");
      setShowPlaylistModal(false);
    }, 1500);
  };

  // ── Remove a track from the open playlist ─────────────────────
  const removeFromPlaylist = async (trackRowId: string) => {
    await supabase.from("playlist_tracks").delete().eq("id", trackRowId);
    setPlaylistTracks((prev) => prev.filter((t) => t.id !== trackRowId));
  };

  // ── Search & add a song directly into the open playlist ────────
  const handleAddSearch = async () => {
    if (!addSearchQuery.trim() || !openPlaylist) return;
    setAddSearchLoading(true);
    setAddSearchResults([]);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(addSearchQuery)}`);
      const data = await res.json();
      const tracks = (data.results ?? [])
        .filter((t: any) => t.previewUrl)
        .slice(0, 6)
        .map((t: any, i: number) => ({
          trackId:     t.trackId,
          title:       t.trackName      ?? "Unknown Title",
          artist:      t.artistName     ?? "Unknown Artist",
          album:       t.collectionName ?? t.trackName ?? "Single",
          albumArt:    t.artworkUrl100?.replace("100x100", "400x400") ?? "",
          previewUrl:  t.previewUrl,
          hookStart:   5,
          hookEnd:     20,
          gradient:    ["from-[#1a0533] via-[#2d1b69] to-[#0d1b2a]",
                        "from-[#0d2137] via-[#1a3a4a] to-[#0a1628]"][i % 2],
        }));
      setAddSearchResults(tracks);
    } catch { /* ignore */ }
    setAddSearchLoading(false);
  };

  const addSearchTrackToPlaylist = async (track: any) => {
    if (!openPlaylist || !userId) return;
    // Duplicate check
    const { data: existing } = await supabase
      .from("playlist_tracks").select("id")
      .eq("playlist_id", openPlaylist.id)
      .eq("track_id", Number(track.trackId))
      .maybeSingle();
    if (existing) { setPlaylistMessage("Already in playlist! 🎵"); setTimeout(() => setPlaylistMessage(""), 1500); return; }
    const { data: newRow, error } = await supabase.from("playlist_tracks").insert({
      playlist_id: openPlaylist.id,
      user_id:     userId,
      track_id:    Number(track.trackId),
      title:       track.title,
      artist:      track.artist,
      album:       track.album,
      album_art:   track.albumArt,
      preview_url: track.previewUrl,
      hook_start:  track.hookStart,
      hook_end:    track.hookEnd,
      gradient:    track.gradient,
    }).select().single();
    if (!error && newRow) {
      setPlaylistTracks((prev) => [...prev, newRow]);
      setPlaylistMessage(`"${track.title}" added! ✅`);
      setTimeout(() => setPlaylistMessage(""), 1500);
    }
  };

  // ── Delete playlist ────────────────────────────────────────────
  const deletePlaylist = async (playlistId: string) => {
    await supabase.from("playlists").delete().eq("id", playlistId);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  };
const startPlaylistPlay = (playlist: Playlist) => {
  setOpenPlaylist(playlist);
  setLoadingTracks(true);
  setPlaylistMenuId(null);
  supabase
    .from("playlist_tracks")
    .select("*")
    .eq("playlist_id", playlist.id)
    .order("created_at", { ascending: true })
    .then(({ data }) => {
      playlistTracksRef.current = data ?? [];
      setPlaylistTracks(data ?? []);
      setLoadingTracks(false);
      if (data && data.length > 0) {
        setIsPlaylistMode(true);
        setPlaylistModeIndex(0);
        setTimeout(() => startPlaylistTrack.current(0), 300);
      }
    });
};

const openPlaylistDetail = (playlist: Playlist) => {
  setOpenPlaylist(playlist);
  setLoadingTracks(true);
  supabase
    .from("playlist_tracks")
    .select("*")
    .eq("playlist_id", playlist.id)
    .order("created_at", { ascending: true })
    .then(({ data, error }) => {
      if (error) console.error("openPlaylistDetail error:", error);
      setPlaylistTracks(data ?? []);
      setLoadingTracks(false);
    });
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
    <main className="h-dvh bg-[#0a0e1a] text-white flex flex-col overflow-hidden">

      {/* ── PLAYLIST PLAY MODE ──────────────────────────────────── */}
      {isPlaylistMode && playlistTracks.length > 0 && (() => {
        const pmTrack = playlistTracks[playlistModeIndex];
        const pmPlaying = playingPlaylistTrackId === pmTrack?.id;
        return (
          <div className="fixed inset-0 z-[200] bg-[#0a0e1a] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4">
              <button onClick={() => {
                audioRef.current?.pause();
                setIsPlaylistMode(false);
                setPlayingPlaylistTrackId(null);
                setIsVibing(false);
              }} className="text-gray-400 hover:text-white text-sm">← exit</button>
              <span className="text-xs text-gray-500">{playlistModeIndex + 1} / {playlistTracks.length}</span>
            </div>
            <div className={`flex-1 flex flex-col items-center justify-center px-6 bg-gradient-to-br ${pmTrack?.gradient}`}>
              {/* Vinyl */}
              <div className="flex justify-center mb-6">
                <div className={`w-72 h-72 rounded-full border-2 border-[#90e0ef]/30 flex items-center justify-center ${pmPlaying ? "animate-spin" : ""}`}
                  style={{ animationDuration: "4s" }}>
                  <div className="w-64 h-64 rounded-full border border-white/10 flex items-center justify-center overflow-hidden"
                    style={{ background: "radial-gradient(circle, #1a1a2e 30%, #0d0d1a 60%, #1a1a2e 80%)" }}>
                    <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#90e0ef]/50 shadow-[0_0_20px_rgba(144,224,239,0.3)]">
                      <img src={pmTrack?.album_art} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Info */}
              <div className="text-center mb-6">
                <h2 className="text-2xl font-medium mb-1">{pmTrack?.title}</h2>
                <p className="text-[#90e0ef] text-base mb-0.5">{pmTrack?.artist}</p>
                <p className="text-gray-500 text-sm">{pmTrack?.album}</p>
                <p className="text-xs text-[#90e0ef]/60 mt-2">hook: {pmTrack?.hook_start}s – {pmTrack?.hook_end}s</p>
              </div>
              {/* Play button */}
              <button
                onClick={() => {
                  if (pmPlaying) {
                    audioRef.current?.pause();
                    setPlayingPlaylistTrackId(null);
                    setIsVibing(false);
                  } else {
                    startPlaylistTrack.current(playlistModeIndex);
                  }
                }}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300 mb-6 ${
                  pmPlaying
                    ? "bg-[#90e0ef] text-[#0a0e1a] scale-110 shadow-[0_0_30px_rgba(144,224,239,0.6)]"
                    : "bg-white/10 text-white hover:bg-[#90e0ef]/20 border border-white/20"
                }`}>
                {pmPlaying ? "⏸" : "▶"}
              </button>
              {/* Prev / Next */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    audioRef.current?.pause();
                    setPlayingPlaylistTrackId(null);
                    setIsVibing(false);
                    setPlaylistModeIndex((p) => Math.max(0, p - 1));
                  }}
                  disabled={playlistModeIndex === 0}
                  className="px-5 py-2 rounded-full bg-white/10 text-gray-400 text-sm disabled:opacity-30 hover:bg-white/20 transition-all">
                  ← prev
                </button>
                <button
                  onClick={() => {
                    audioRef.current?.pause();
                    setPlayingPlaylistTrackId(null);
                    setIsVibing(false);
                    setPlaylistModeIndex((p) => Math.min(playlistTracks.length - 1, p + 1));
                  }}
                  disabled={playlistModeIndex === playlistTracks.length - 1}
                  className="px-5 py-2 rounded-full bg-white/10 text-gray-400 text-sm disabled:opacity-30 hover:bg-white/20 transition-all">
                  next →
                </button>
              </div>
              <p className="text-gray-600 text-xs mt-6">auto-plays next hook when done 🎵</p>
            </div>
          </div>
        );
      })()}

      {/* ── SHARE TOAST ─────────────────────────────────────────── */}
      {shareToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] bg-[#0e2a3b] border border-[#90e0ef]/40 text-[#90e0ef] text-sm px-5 py-2.5 rounded-full shadow-lg animate-pulse pointer-events-none">
          {shareToast}
        </div>
      )}

      {/* ── PLAYLIST MODAL ──────────────────────────────────────── */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center px-4">
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
            <div className="flex flex-col gap-2 max-h-48 scroll-touch">
              {playlists.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  no playlists yet — create one above!
                </p>
              ) : (
                playlists.map((playlist) => (
                  <button key={playlist.id}
                    onClick={() => addToPlaylist(playlist.id, playlist.name)}
                    className="w-full py-3 px-4 rounded-2xl bg-white/5 border border-[#90e0ef]/20 text-white text-left text-sm hover:bg-white/10 hover:border-[#90e0ef]/50 transition-all flex items-center gap-3">
                    <span className="text-lg">🎵</span>
                    <span className="flex-1">{playlist.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">{playlistCounts[playlist.id] ?? 0} songs</span>
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
        <a href="/home">
          <h1 className="text-3xl text-[#90e0ef] cursor-pointer hover:opacity-80 transition-opacity" style={{ fontFamily: "cursive" }}>Hookify</h1>
        </a>
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
      <div className="flex-1 flex flex-col items-center justify-start px-2 pt-2 pb-4 scroll-touch">

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
              <div
                key={currentHook.id}
                onTouchStart={(e) => { (e.currentTarget as any)._startX = e.touches[0].clientX; }}
                onTouchEnd={(e) => {
                  const startX = (e.currentTarget as any)._startX;
                  const diff = e.changedTouches[0].clientX - startX;
                  if (diff < -60) swipeNext();
                  else if (diff > 60) swipePrev();
                }}
                onMouseDown={(e) => { (e.currentTarget as any)._startX = e.clientX; }}
                onMouseUp={(e) => {
                  const startX = (e.currentTarget as any)._startX;
                  const diff = e.clientX - startX;
                  if (diff < -60) swipeNext();
                  else if (diff > 60) swipePrev();
                }}
                className={`bg-gradient-to-br ${currentHook.gradient} rounded-3xl p-5 sm:p-8 border border-white/10 cursor-grab active:cursor-grabbing flex flex-col justify-between min-h-[72vh]`}
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}
              >
                {/* Vinyl */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className={`w-56 h-56 sm:w-64 sm:h-64 rounded-full border-2 border-[#90e0ef]/30 flex items-center justify-center ${isPlaying ? "animate-spin" : ""}`}
                      style={{ animationDuration: "4s" }}>
                      <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-white/10 flex items-center justify-center overflow-hidden"
                        style={{ background: "radial-gradient(circle, #1a1a2e 30%, #0d0d1a 60%, #1a1a2e 80%)" }}>
                        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-white/5 flex items-center justify-center">
                          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#90e0ef]/50 shadow-[0_0_20px_rgba(144,224,239,0.3)]">
                            <img src={currentHook.albumArt} alt={currentHook.album} className="w-full h-full object-cover" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#0a0e1a] border border-white/20" />
                  </div>
                </div>

                {/* Song info */}
                <div className="text-center mb-4 px-2">
                  <h2 className="text-2xl sm:text-3xl font-medium mb-1 truncate">{currentHook.title}</h2>
                  <p className="text-[#90e0ef] text-sm sm:text-base mb-0.5 truncate">{currentHook.artist}</p>
                  <p className="text-gray-500 text-xs sm:text-sm truncate">{currentHook.album}</p>
                </div>

                {/* Stats */}
                <div className="flex justify-center gap-4 sm:gap-6 mb-5">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">hook</p>
                    <p className="text-sm sm:text-base text-[#90e0ef] font-medium">
                      {currentHook.hookStart}s – {currentHook.hookEnd}s
                    </p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">track</p>
                    <p className="text-sm sm:text-base text-[#90e0ef] font-medium">#{currentIndex + 1} / {hooks.length}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">saved</p>
                    <p className="text-sm sm:text-base font-medium">
                      {savedHooks.includes(currentHook.id) ? <span className="text-red-400">❤️</span> : <span className="text-gray-500">🤍</span>}
                    </p>
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

                  {/* Loop button */}
                  <button
                    onClick={() => setIsLooping((p) => { isLoopingRef.current = !p; return !p; })}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <span className={`text-3xl transition-transform duration-200 group-hover:scale-125 ${
                      isLooping ? "text-[#90e0ef]" : "text-gray-400"
                    }`}>
                      🔁
                    </span>
                    <span className={`text-xs ${isLooping ? "text-[#90e0ef]" : "text-gray-500"}`}>loop{isLooping ? " on" : ""}</span>
                  </button>

                  <button onClick={() => setShowPlaylistModal(true)} className="flex flex-col items-center gap-1 group">
                    <span className="text-3xl text-gray-400 group-hover:scale-125 transition-transform">➕</span>
                    <span className="text-xs text-gray-500">playlist</span>
                  </button>
                </div>
              </div>
            </AnimatePresence>
            <p className="text-center text-gray-500 text-xs mt-3 tracking-wide">← swipe to change hook →</p>
          </div>
        )}

        {/* ══ SAVED TAB ═══════════════════════════════════════════ */}
        {activeTab === "saved" && (
          <div className="w-full max-w-2xl">
            <h2 className="text-xl font-medium mb-6 text-center text-[#90e0ef]">your saved hooks 💾</h2>
            {savedHooksFull.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🐘</p>
                <p className="text-gray-400 text-sm">no saved hooks yet!</p>
                <p className="text-gray-600 text-xs mt-1">tap the heart on any hook to save it</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {savedHooksFull.map((hook) => (
                  <div key={hook.id ?? hook.track_id}
                    className={`bg-gradient-to-r ${hook.gradient} rounded-2xl p-4 border border-white/10 flex items-center gap-4`}>
                    <img src={hook.album_art} alt={hook.album}
                      className="w-14 h-14 rounded-full object-cover border border-[#90e0ef]/30 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{hook.title}</p>
                      <p className="text-sm text-gray-400 truncate">{hook.artist}</p>
                      <span className="text-xs text-[#90e0ef]">{hook.hook_start}s–{hook.hook_end}s</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          // Toggle: pause if this track is already playing
                          if (savedPlayingUrl === hook.preview_url && savedAudio && !savedAudio.paused) {
                            savedAudio.pause();
                            setSavedPlayingUrl(null);
                            return;
                          }
                          // Stop any other playing track first
                          savedAudio?.pause();
                          const a = new Audio(hook.preview_url);
                          a.currentTime = hook.hook_start;
                          a.ontimeupdate = () => { if (a.currentTime >= hook.hook_end) { a.pause(); a.currentTime = hook.hook_start; setSavedPlayingUrl(null); } };
                          a.onended = () => setSavedPlayingUrl(null);
                          a.play();
                          setSavedAudio(a);
                          setSavedPlayingUrl(hook.preview_url);
                        }}
                        className="w-9 h-9 rounded-full bg-[#90e0ef]/20 border border-[#90e0ef]/40 flex items-center justify-center text-[#90e0ef] hover:bg-[#90e0ef] hover:text-[#0a0e1a] transition-all text-sm">
                        {savedPlayingUrl === hook.preview_url && savedAudio && !savedAudio.paused ? "⏸" : "▶"}
                      </button>
                      <button
                        onClick={async () => {
                          setSavedHooks((prev) => prev.filter((id) => id !== Number(hook.track_id)));
                          setSavedHooksFull((prev) => prev.filter((h) => h.track_id !== hook.track_id));
                          if (userId) await supabase.from("saved_hooks").delete().eq("user_id", userId).eq("track_id", hook.track_id);
                        }}
                        className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-all text-sm">
                        🗑️
                      </button>
                    </div>
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
                  {(() => {
                    const badges = [
                      { label: "🔥 hot",    cls: "bg-red-500/15 text-red-400"         },
                      { label: "⚡ viral",  cls: "bg-[#90e0ef]/15 text-[#90e0ef]"     },
                      { label: "🚀 rising", cls: "bg-purple-500/15 text-purple-400"   },
                      { label: "✨ new",    cls: "bg-green-500/15 text-green-400"      },
                      { label: "💫 fresh",  cls: "bg-yellow-500/15 text-yellow-400"   },
                    ];
                    const b = badges[Math.min(index, badges.length - 1)];
                    return (
                      <span className={`text-xs px-3 py-1 rounded-full flex-shrink-0 ${b.cls}`}>
                        {b.label}
                      </span>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PLAYLISTS TAB ═══════════════════════════════════════ */}
        {activeTab === "playlists" && (
          <div className="w-full max-w-2xl">
            {/* ── Playlist detail view ── */}
            {openPlaylist ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => { setOpenPlaylist(null); setShowAddToPlaylistSearch(false); setAddSearchResults([]); setAddSearchQuery(""); }}
                    className="text-gray-400 hover:text-white text-sm">← back</button>
                  <h2 className="text-xl font-medium text-[#90e0ef] flex-1 truncate">{openPlaylist.name}</h2>
                  <button
                    onClick={() => { setShowAddToPlaylistSearch(true); setAddSearchResults([]); setAddSearchQuery(""); }}
                    className="px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-all flex-shrink-0">
                    + add
                  </button>
                  {playlistTracks.length > 0 && (
                    <button
                      onClick={() => {
                        setPlaylistModeIndex(0);
                        setIsPlaylistMode(true);
                        setTimeout(() => startPlaylistTrack.current(0), 300);
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#90e0ef] text-[#0a0e1a] text-xs font-bold hover:opacity-90 flex-shrink-0">
                      ▶ play all
                    </button>
                  )}
                </div>

                {/* ── Add song search modal ── */}
                {showAddToPlaylistSearch && (
                  <div className="mb-5 bg-[#0e2a3b] rounded-2xl p-4 border border-[#90e0ef]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-sm text-[#90e0ef] font-medium flex-1">search songs to add</p>
                      <button onClick={() => { setShowAddToPlaylistSearch(false); setAddSearchResults([]); setAddSearchQuery(""); }}
                        className="text-gray-500 hover:text-white text-lg leading-none">×</button>
                    </div>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={addSearchQuery}
                        onChange={(e) => setAddSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSearch()}
                        placeholder="song name or artist..."
                        className="flex-1 px-3 py-2 rounded-full bg-[#0a0e1a] border border-white/10 text-white text-sm placeholder-gray-500 outline-none focus:border-[#90e0ef] transition-colors"
                        autoFocus
                      />
                      <button onClick={handleAddSearch}
                        className="px-4 py-2 rounded-full bg-[#90e0ef] text-[#0a0e1a] text-sm font-bold hover:opacity-90 transition-all">
                        {addSearchLoading ? "..." : "search"}
                      </button>
                    </div>
                    {playlistMessage && (
                      <p className="text-xs text-center text-[#90e0ef] mb-2">{playlistMessage}</p>
                    )}
                    {addSearchResults.length > 0 && (
                      <div className="flex flex-col gap-2 max-h-60 scroll-touch">
                        {addSearchResults.map((track) => (
                          <div key={track.trackId} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2">
                            <img src={track.albumArt} alt={track.title}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-white/10" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{track.title}</p>
                              <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Play/pause preview */}
                              <button
                                onClick={() => {
                                  if (previewingTrackId === track.trackId && previewAudio && !previewAudio.paused) {
                                    previewAudio.pause();
                                    setPreviewingTrackId(null);
                                    return;
                                  }
                                  previewAudio?.pause();
                                  const a = new Audio(track.previewUrl);
                                  a.currentTime = track.hookStart;
                                  a.ontimeupdate = () => { if (a.currentTime >= track.hookEnd) { a.pause(); setPreviewingTrackId(null); } };
                                  a.onended = () => setPreviewingTrackId(null);
                                  a.play().catch(() => {});
                                  setPreviewAudio(a);
                                  setPreviewingTrackId(track.trackId);
                                }}
                                className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all text-xs">
                                {previewingTrackId === track.trackId && previewAudio && !previewAudio.paused ? "⏸" : "▶"}
                              </button>
                              {/* Add button */}
                              <button
                                onClick={() => addSearchTrackToPlaylist(track)}
                                className="px-3 py-1 rounded-full bg-[#90e0ef]/20 border border-[#90e0ef]/40 text-[#90e0ef] text-xs font-bold hover:bg-[#90e0ef] hover:text-[#0a0e1a] transition-all">
                                + add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {loadingTracks ? (
                  <p className="text-gray-400 text-sm text-center animate-pulse">loading...</p>
                ) : playlistTracks.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-6xl mb-4">🎵</p>
                    <p className="text-gray-400 text-sm">no songs in this playlist yet!</p>
                    <p className="text-gray-600 text-xs mt-1">tap "+ add" above or ➕ on any hook</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {playlistTracks.map((track) => (
                      <div key={track.id}
                        className={`bg-gradient-to-r ${track.gradient} rounded-2xl p-4 border border-white/10 flex items-center gap-4`}>
                        <img src={track.album_art} alt={track.album}
                          className="w-14 h-14 rounded-full object-cover border border-[#90e0ef]/30 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{track.title}</p>
                          <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                          <span className="text-xs text-[#90e0ef]">
                            {track.hook_start}s–{track.hook_end}s
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (playingPlaylistTrackId === track.id) {
                                audioRef.current?.pause();
                                setPlayingPlaylistTrackId(null);
                                setIsVibing(false);
                                return;
                              }
                              audioRef.current?.pause();
                              const newAudio = new Audio(track.preview_url);
                              newAudio.currentTime = track.hook_start;
                              newAudio.ontimeupdate = () => {
                                if (newAudio.currentTime >= track.hook_end) {
                                  newAudio.pause();
                                  setPlayingPlaylistTrackId(null);
                                  setIsVibing(false);
                                }
                              };
                              newAudio.play().catch(() => {});
                              audioRef.current = newAudio;
                              setPlayingPlaylistTrackId(track.id);
                              setIsVibing(true);
                            }}
                            className="w-9 h-9 rounded-full bg-[#90e0ef]/20 border border-[#90e0ef]/40 flex items-center justify-center text-[#90e0ef] hover:bg-[#90e0ef] hover:text-[#0a0e1a] transition-all text-sm">
                            {playingPlaylistTrackId === track.id ? "⏸" : "▶"}
                          </button>
                          <button
                            onClick={() => removeFromPlaylist(track.id)}
                            className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center hover:bg-red-500 transition-all text-sm">
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* ── Playlist list view ── */
              <>
                <h2 className="text-xl font-medium mb-6 text-center text-[#90e0ef]">your playlists 🎵</h2>
                {playlists.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-6xl mb-4">🎵</p>
                    <p className="text-gray-400 text-sm">no playlists yet!</p>
                    <p className="text-gray-600 text-xs mt-1">tap ➕ on any hook to create one</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {playlists.map((playlist) => (
                      <div key={playlist.id} className="relative">
                        <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-4 py-4 border border-white/10 hover:border-[#90e0ef]/30 transition-all">
                          <button
                            onClick={() => openPlaylistDetail(playlist)}
                            className="flex items-center gap-4 flex-1 min-w-0 text-left">
                            <div className="w-12 h-12 rounded-xl bg-[#90e0ef]/20 border border-[#90e0ef]/30 flex items-center justify-center text-xl flex-shrink-0">🎵</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-white">{playlist.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {playlistCounts[playlist.id] ?? 0} {(playlistCounts[playlist.id] ?? 0) === 1 ? "hook" : "hooks"}
                              </p>
                            </div>
                            <span className="text-gray-400 text-lg mr-2">›</span>
                          </button>
                          <button
                            onClick={() => setPlaylistMenuId(playlistMenuId === playlist.id ? null : playlist.id)}
                            className="text-gray-400 hover:text-white transition-colors text-xl px-1 flex-shrink-0">
                            ⋯
                          </button>
                        </div>
                        {playlistMenuId === playlist.id && (
                          <div className="absolute right-0 top-full mt-1 bg-[#0e2a3b] border border-[#90e0ef]/20 rounded-2xl overflow-hidden z-10 shadow-xl min-w-[170px]">
                            <button
                              onClick={() => { openPlaylistDetail(playlist); setPlaylistMenuId(null); }}
                              className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/10 transition-all">
                              📂 open playlist
                            </button>
                            <button
                              onClick={() => { startPlaylistPlay(playlist); setActiveTab("playlists"); }}
                              className="w-full px-4 py-3 text-left text-sm text-[#90e0ef] hover:bg-white/10 transition-all border-t border-white/10">
                              ▶ play playlist
                            </button>
                            <button
                              onClick={() => { deletePlaylist(playlist.id); setPlaylistMenuId(null); }}
                              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-all border-t border-white/10">
                              🗑️ delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* ══ PROFILE TAB ═════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="w-full max-w-2xl text-center">
            <Image src="/Elephant_Beats.jpeg" alt="Profile" width={90} height={90}
              className="rounded-full border-2 border-[#90e0ef] mx-auto mb-4 shadow-[0_0_20px_rgba(144,224,239,0.4)]" />
            <h2 className="text-xl font-medium mb-1 truncate px-4">{userEmail || "hook listener"}</h2>
            <p className="text-gray-500 text-sm mb-8">🎧 hook listener</p>
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
                <p className="text-2xl font-medium text-[#90e0ef]">{totalPlays}</p>
                <p className="text-xs text-gray-400">plays</p>
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
      <nav className="flex justify-around items-center px-2 py-3 border-t border-white/10 bg-[#0a0e1a] safe-bottom">
        {[
          { id: "home",      icon: "🏠", label: "home"      , href: null      },
          { id: "trending",  icon: "🔥", label: "trending"  , href: null      },
          { id: "saved",     icon: "💾", label: "saved"     , href: null      },
          { id: "search",    icon: "🔍", label: "search"    , href: "/search" },
          { id: "playlists", icon: "🎵", label: "lists"     , href: null      },
          { id: "profile",   icon: "👤", label: "profile"   , href: null      },
        ].map((tab) => (
          <button key={tab.id}
            onClick={() => {
              if (tab.href) { window.location.href = tab.href; return; }
              if (tab.id === "playlists") setOpenPlaylist(null);
              setActiveTab(tab.id);
            }}
            className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-all duration-200 min-w-0 ${
              activeTab === tab.id
                ? "text-[#90e0ef]"
                : "text-gray-500 hover:text-gray-300"
            }`}>
            <span className={`text-xl transition-transform duration-200 ${activeTab === tab.id ? "scale-110" : ""}`}>
              {tab.icon}
            </span>
            <span className="text-[10px] leading-none truncate w-full text-center">{tab.label}</span>
          </button>
        ))}
      </nav>

    </main>
  );
}