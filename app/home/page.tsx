// app/home/page.tsx
// Main home page — TikTok swipe feed with REAL music from iTunes API
// Real album art, real 30-second audio previews!

"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { fetchAllHooks, type Track } from "@/lib/itunes";

// ── Main Component ───────────────────────────────────────────────
export default function HomePage() {
  const [hooks, setHooks]               = useState<Track[]>([]);
  const [loading, setLoading]           = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection]       = useState<"left" | "right" | null>(null);
  const [isVibing, setIsVibing]         = useState(false);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [activeTab, setActiveTab]       = useState("home");
  const [savedHooks, setSavedHooks]     = useState<number[]>([]);

  // useRef gives us direct access to the HTML audio element
  // This is how we play/pause real audio in React
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Fetch real songs from iTunes when page loads ───────────────
  useEffect(() => {
    async function fetchHooks() {
      setLoading(true);
      const validHooks = await fetchAllHooks();
      setHooks(validHooks);
      setLoading(false);
    }

    fetchHooks();
  }, []); // Empty array = run once when page loads

  // ── Clean up audio when component unmounts ─────────────────────
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const currentHook = hooks[currentIndex];

  // ── Play the HOOK part only (not full 30s preview) ─────────────
  // hookStart and hookEnd tell us exactly which seconds to play
  // This is Option A — later AI will detect these automatically!
  const togglePlay = () => {
    if (!currentHook?.previewUrl) return;

    if (isPlaying) {
      // Pause
      audioRef.current?.pause();
      setIsPlaying(false);
      setIsVibing(false);
    } else {
      // Create new audio or reuse existing
      if (!audioRef.current || audioRef.current.src !== currentHook.previewUrl) {
        audioRef.current?.pause();
        audioRef.current = new Audio(currentHook.previewUrl);

        // Jump to hook start time immediately
        audioRef.current.currentTime = currentHook.hookStart;

        // Stop playing when hook ends
        audioRef.current.ontimeupdate = () => {
          if (
            audioRef.current &&
            audioRef.current.currentTime >= currentHook.hookEnd
          ) {
            audioRef.current.pause();
            audioRef.current.currentTime = currentHook.hookStart; // Reset to hook start
            setIsPlaying(false);
            setIsVibing(false);
          }
        };

        // Also handle natural audio end
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setIsVibing(false);
        };
      } else {
        // Same song — just jump back to hook start
        audioRef.current.currentTime = currentHook.hookStart;
      }

      audioRef.current.play();
      setIsPlaying(true);
      setIsVibing(true);
    }
  };
  // ── Swipe to next hook ─────────────────────────────────────────
  const swipeNext = () => {
    if (currentIndex < hooks.length - 1) {
      // Stop current audio before switching
      audioRef.current?.pause();
      setIsPlaying(false);
      setIsVibing(false);

      setDirection("left");
      setTimeout(() => {
        setCurrentIndex((p) => p + 1);
        setDirection(null);
      }, 300);
    }
  };

  // ── Swipe to previous hook ─────────────────────────────────────
  const swipePrev = () => {
    if (currentIndex > 0) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setIsVibing(false);

      setDirection("right");
      setTimeout(() => {
        setCurrentIndex((p) => p - 1);
        setDirection(null);
      }, 300);
    }
  };

  // ── Like / unlike a hook ───────────────────────────────────────
  const toggleLike = () => {
    if (!currentHook) return;
    setHooks((prev) =>
      prev.map((h) =>
        h.id === currentHook.id ? { ...h, liked: !h.liked } : h
      )
    );
    setSavedHooks((prev) =>
      prev.includes(currentHook.id)
        ? prev.filter((id) => id !== currentHook.id)
        : [...prev, currentHook.id]
    );
  };

  // ── Loading screen while fetching songs ────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col items-center justify-center gap-4">
        <Image
          src="/Elephant_Beats.jpeg"
          alt="Loading"
          width={80}
          height={80}
          className="rounded-full border-2 border-[#90e0ef] animate-bounce"
        />
        <p className="text-[#90e0ef] text-sm tracking-widest uppercase animate-pulse">
          fetching hooks...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col">

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-4">
        <h1 className="text-3xl text-[#90e0ef]" style={{ fontFamily: "cursive" }}>
          Hookify
        </h1>

        {/* Elephant — bounces and glows when music plays */}
        <div className="relative cursor-pointer" onClick={togglePlay}>
          <Image
            src="/Elephant_Beats.jpeg"
            alt="Hookify mascot"
            width={50}
            height={50}
            className={`rounded-full border-2 border-[#90e0ef] transition-all duration-300 ${
              isVibing
                ? "animate-bounce scale-110 shadow-[0_0_20px_rgba(144,224,239,0.7)]"
                : "hover:scale-110"
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

            {/* Progress dots */}
            <div className="flex gap-2 justify-center mb-4">
              {hooks.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex ? "w-8 bg-[#90e0ef]" : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* ── SWIPEABLE CARD ────────────────────────────────── */}
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
                style={{
                  boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
                }}
              >
                {/* ── ALBUM ART + VINYL EFFECT ─────────────────── */}
                <div className="flex justify-center mb-4">
                  <div className="relative">

                    {/* Spinning outer ring */}
                    <div
                      className={`w-80 h-80 rounded-full border-2 border-[#90e0ef]/30 flex items-center justify-center ${
                        isPlaying ? "animate-spin" : ""
                      }`}
                      style={{ animationDuration: "4s" }}
                    >
                      {/* Vinyl grooves */}
                      <div
                        className="w-72 h-72 rounded-full border border-white/10 flex items-center justify-center overflow-hidden"
                        style={{
                          background: "radial-gradient(circle, #1a1a2e 30%, #0d0d1a 60%, #1a1a2e 80%)",
                        }}
                      >
                        <div className="w-60 h-60 rounded-full border border-white/5 flex items-center justify-center">
                          <div className="w-48 h-48 rounded-full border border-white/5 flex items-center justify-center">

                            {/* Real album art in the center! */}
                            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#90e0ef]/50 shadow-[0_0_20px_rgba(144,224,239,0.3)]">
                              <img
                                src={currentHook.albumArt}
                                alt={currentHook.album}
                                className="w-full h-full object-cover"
                              />
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center hole */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0a0e1a] border border-white/20" />

                  </div>
                </div>

                {/* ── SONG INFO ────────────────────────────────── */}
                <div className="text-center mb-4">
                  <h2 className="text-3xl font-medium mb-1">{currentHook.title}</h2>
                  <p className="text-[#90e0ef] text-base mb-0.5">{currentHook.artist}</p>
                  <p className="text-gray-500 text-sm">{currentHook.album}</p>
                </div>

                {/* ── STATS ────────────────────────────────────── */}
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

                {/* ── PLAY BUTTON ──────────────────────────────── */}
                <div className="flex justify-center mb-6">
                  <button
                    onClick={togglePlay}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${
                      isPlaying
                        ? "bg-[#90e0ef] text-[#0a0e1a] scale-110 shadow-[0_0_30px_rgba(144,224,239,0.6)]"
                        : "bg-white/10 text-white hover:bg-[#90e0ef]/20 border border-white/20"
                    }`}
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                </div>

                {/* ── ACTION BUTTONS ───────────────────────────── */}
                <div className="flex justify-around items-center">
                  <button onClick={toggleLike} className="flex flex-col items-center gap-1 group">
                    <span className={`text-3xl transition-transform duration-200 group-hover:scale-125 ${
                      currentHook.liked ? "text-red-400" : "text-gray-400"
                    }`}>
                      {currentHook.liked ? "❤️" : "🤍"}
                    </span>
                    <span className="text-xs text-gray-500">save</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 group">
                    <span className="text-3xl text-gray-400 group-hover:scale-125 transition-transform">📤</span>
                    <span className="text-xs text-gray-500">share</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 group">
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
                <div
                  key={hook.id}
                  className="flex items-center gap-4 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 px-3 rounded-xl transition-all"
                  onClick={() => { setCurrentIndex(index); setActiveTab("home"); }}
                >
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

        {/* ══ PROFILE TAB ═════════════════════════════════════════ */}
        {activeTab === "profile" && (
          <div className="w-full max-w-2xl text-center">
            <Image
              src="/Elephant_Beats.jpeg"
              alt="Profile"
              width={90}
              height={90}
              className="rounded-full border-2 border-[#90e0ef] mx-auto mb-4 shadow-[0_0_20px_rgba(144,224,239,0.4)]"
            />
            <h2 className="text-xl font-medium mb-1">shreya goyal</h2>
            <p className="text-gray-400 text-sm mb-8">hook listener 🎧</p>
            <div className="flex justify-center gap-12 mb-8">
              <div>
                <p className="text-2xl font-medium text-[#90e0ef]">{savedHooks.length}</p>
                <p className="text-xs text-gray-400">saved hooks</p>
              </div>
              <div>
                <p className="text-2xl font-medium text-[#90e0ef]">{hooks.length}</p>
                <p className="text-xs text-gray-400">hooks played</p>
              </div>
            </div>
            <button className="w-64 py-3 rounded-full border border-[#90e0ef]/30 text-[#90e0ef] text-sm hover:bg-[#90e0ef]/10 transition-all">
              edit profile
            </button>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV ──────────────────────────────────────────── */}
      <nav className="flex justify-around items-center px-6 py-4 border-t border-white/10 bg-[#0a0e1a]">
        {[
          { id: "home",     icon: "🏠", label: "home"     },
          { id: "trending", icon: "🔥", label: "trending" },
          { id: "saved",    icon: "💾", label: "saved"    },
          { id: "profile",  icon: "👤", label: "profile"  },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-all duration-200 ${
              activeTab === tab.id ? "text-[#90e0ef] scale-110" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </nav>

    </main>
  );
}