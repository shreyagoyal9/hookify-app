// app/home/page.tsx
// MAIN HOME PAGE of Hookify
// TikTok-style swipe feed with spinning vinyl, bottom nav, vibing elephant

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// ── Type: what a Hook object looks like ─────────────────────────
type Hook = {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  plays: string;
  gradient: string;
  liked: boolean;
};

// ── Dummy song data (Spotify API will replace this later) ────────
const HOOKS: Hook[] = [
  { id: 1, title: "Espresso",               artist: "Sabrina Carpenter",      album: "Short n' Sweet",             duration: "0:14", plays: "28M", gradient: "from-[#1a0533] via-[#2d1b69] to-[#0d1b2a]", liked: false },
  { id: 2, title: "Not Like Us",            artist: "Kendrick Lamar",         album: "GNX",                        duration: "0:12", plays: "41M", gradient: "from-[#0d2137] via-[#1a3a4a] to-[#0a1628]", liked: false },
  { id: 3, title: "APT.",                   artist: "ROSÉ & Bruno Mars",      album: "APT. Single",                duration: "0:15", plays: "55M", gradient: "from-[#1a0a2e] via-[#2d0a3a] to-[#0d1a1a]", liked: false },
  { id: 4, title: "Kesariya",              artist: "Arijit Singh",            album: "Brahmastra",                 duration: "0:13", plays: "19M", gradient: "from-[#2a1a0d] via-[#3d2510] to-[#1a0d05]", liked: false },
  { id: 5, title: "Phir Aur Kya Chahiye", artist: "Arijit Singh",            album: "Zara Hatke Zara Bachke",     duration: "0:14", plays: "22M", gradient: "from-[#0d1a2a] via-[#1a2d3a] to-[#0a1520]", liked: false },
  { id: 6, title: "Die With A Smile",      artist: "Lady Gaga & Bruno Mars", album: "Die With A Smile",           duration: "0:15", plays: "60M", gradient: "from-[#1a0d2a] via-[#2a1540] to-[#0d0d1a]", liked: false },
];

// ── Main Component ───────────────────────────────────────────────
export default function HomePage() {
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [direction, setDirection]         = useState<"left" | "right" | null>(null);
  const [isVibing, setIsVibing]           = useState(false);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [activeTab, setActiveTab]         = useState("home");
  const [savedHooks, setSavedHooks]       = useState<number[]>([]);
  const [hooks, setHooks]                 = useState<Hook[]>(HOOKS);

  const currentHook = hooks[currentIndex];

  // Go to next hook card
  const swipeNext = () => {
    if (currentIndex < hooks.length - 1) {
      setDirection("left");
      setTimeout(() => {
        setCurrentIndex((p) => p + 1);
        setDirection(null);
        setIsPlaying(false);
        setIsVibing(false);
      }, 300);
    }
  };

  // Go to previous hook card
  const swipePrev = () => {
    if (currentIndex > 0) {
      setDirection("right");
      setTimeout(() => {
        setCurrentIndex((p) => p - 1);
        setDirection(null);
      }, 300);
    }
  };

  // Like or unlike a hook and update saved list
  const toggleLike = () => {
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

  // Start or stop playback + elephant vibing
  const togglePlay = () => {
    setIsPlaying((p) => !p);
    setIsVibing((p) => !p);
  };

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col">

      {/* ── NAVBAR ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-4 z-10">
        <h1 className="text-3xl text-[#90e0ef]" style={{ fontFamily: "cursive" }}>
          Hookify
        </h1>

        {/* Elephant logo — bounces and glows when music plays */}
        <div className="relative">
          <Image
            src="/Elephant_Beats.jpeg"
            alt="Hookify mascot"
            width={50}
            height={50}
            className={`rounded-full border-2 border-[#90e0ef] cursor-pointer transition-all duration-300 ${
              isVibing
                ? "animate-bounce scale-110 shadow-[0_0_20px_rgba(144,224,239,0.7)]"
                : "hover:scale-110"
            }`}
            onClick={togglePlay}
          />
          {/* Pulsing green dot when playing */}
          {isVibing && (
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-[#0a0e1a] animate-pulse" />
          )}
        </div>
      </nav>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start px-2 pt-2 pb-4">

        {/* ══ HOME TAB ══════════════════════════════════════════ */}
        {activeTab === "home" && currentHook && (
          <div className="w-full max-w-4xl">

            {/* Progress dots — show which hook you're on */}
            <div className="flex gap-2 justify-center mb-4">
              {hooks.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex
                      ? "w-8 bg-[#90e0ef]"
                      : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* ── SWIPEABLE HOOK CARD ───────────────────────── */}
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
                  backdropFilter: "blur(10px)",
                }}
              >
                {/* ── SPINNING VINYL CD ──────────────────────── */}
                <div className="flex justify-center mb-4">
                  <div className="relative">

                    {/* Outer ring — spins when playing */}
                    <div
                      className={`w-80 h-80 rounded-full border-2 border-[#90e0ef]/30 flex items-center justify-center ${
                        isPlaying ? "animate-spin" : ""
                      }`}
                      style={{ animationDuration: "4s" }}
                    >
                      {/* Vinyl grooves — layered rings for depth */}
                      <div
                        className="w-72 h-72 rounded-full border border-white/10 flex items-center justify-center"
                        style={{ background: "radial-gradient(circle, #1a1a2e 30%, #0d0d1a 60%, #1a1a2e 80%)" }}
                      >
                        <div className="w-60 h-60 rounded-full border border-white/5 flex items-center justify-center">
                          <div className="w-48 h-48 rounded-full border border-white/5 flex items-center justify-center">

                            {/* Center label — artist initial */}
                            <div className="w-24 h-24 rounded-full bg-[#90e0ef]/20 border-2 border-[#90e0ef]/50 flex items-center justify-center shadow-[0_0_20px_rgba(144,224,239,0.3)]">
                              <span className="text-[#90e0ef] text-4xl font-bold">
                                {currentHook.artist.charAt(0)}
                              </span>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Center hole of vinyl */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#0a0e1a] border border-white/20" />

                  </div>
                </div>

                {/* ── SONG INFO ──────────────────────────────── */}
                <div className="text-center mb-4">
                  <h2 className="text-3xl font-medium mb-1">{currentHook.title}</h2>
                  <p className="text-[#90e0ef] text-base mb-0.5">{currentHook.artist}</p>
                  <p className="text-gray-500 text-sm">{currentHook.album}</p>
                </div>

                {/* ── STATS ROW ──────────────────────────────── */}
                <div className="flex justify-center gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">duration</p>
                    <p className="text-base text-[#90e0ef] font-medium">{currentHook.duration}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">plays</p>
                    <p className="text-base text-[#90e0ef] font-medium">{currentHook.plays}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">hook</p>
                    <p className="text-base text-[#90e0ef] font-medium">#{currentIndex + 1}</p>
                  </div>
                </div>

                {/* ── PLAY / PAUSE BUTTON ────────────────────── */}
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

                {/* ── ACTION BUTTONS ─────────────────────────── */}
                <div className="flex justify-around items-center">

                  {/* Like / Save */}
                  <button
                    onClick={toggleLike}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <span className={`text-3xl transition-transform duration-200 group-hover:scale-125 ${
                      currentHook.liked ? "text-red-400" : "text-gray-400"
                    }`}>
                      {currentHook.liked ? "❤️" : "🤍"}
                    </span>
                    <span className="text-xs text-gray-500">save</span>
                  </button>

                  {/* Share */}
                  <button className="flex flex-col items-center gap-1 group">
                    <span className="text-3xl text-gray-400 group-hover:scale-125 transition-transform duration-200">
                      📤
                    </span>
                    <span className="text-xs text-gray-500">share</span>
                  </button>

                  {/* Add to playlist */}
                  <button className="flex flex-col items-center gap-1 group">
                    <span className="text-3xl text-gray-400 group-hover:scale-125 transition-transform duration-200">
                      ➕
                    </span>
                    <span className="text-xs text-gray-500">playlist</span>
                  </button>

                </div>
              </motion.div>
            </AnimatePresence>

            {/* Swipe hint */}
            <p className="text-center text-gray-600 text-xs mt-3">
              ← drag to swipe hooks →
            </p>
          </div>
        )}

        {/* ══ SAVED TAB ═════════════════════════════════════════ */}
        {activeTab === "saved" && (
          <div className="w-full max-w-2xl">
            <h2 className="text-xl font-medium mb-6 text-center text-[#90e0ef]">
              your saved hooks 💾
            </h2>

            {savedHooks.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-6xl mb-4">🐘</p>
                <p className="text-gray-400 text-sm">no saved hooks yet!</p>
                <p className="text-gray-600 text-xs mt-1">tap the heart on any hook to save it</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {hooks
                  .filter((h) => savedHooks.includes(h.id))
                  .map((hook) => (
                    <div
                      key={hook.id}
                      className={`bg-gradient-to-r ${hook.gradient} rounded-2xl p-4 border border-white/10 flex items-center gap-4`}
                    >
                      {/* Mini vinyl */}
                      <div className="w-14 h-14 rounded-full border border-[#90e0ef]/30 bg-[#0a0e1a]/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#90e0ef] font-bold text-lg">{hook.artist.charAt(0)}</span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{hook.title}</p>
                        <p className="text-sm text-gray-400 truncate">{hook.artist}</p>
                      </div>
                      {/* Duration */}
                      <span className="text-sm text-[#90e0ef] bg-[#90e0ef]/10 px-3 py-1 rounded-full">
                        {hook.duration}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TRENDING TAB ══════════════════════════════════════ */}
        {activeTab === "trending" && (
          <div className="w-full max-w-2xl">
            <h2 className="text-xl font-medium mb-6 text-center text-[#90e0ef]">
              🔥 viral this week
            </h2>
            <div className="flex flex-col">
              {hooks.map((hook, index) => (
                <div
                  key={hook.id}
                  className="flex items-center gap-4 py-4 border-b border-white/5 cursor-pointer hover:bg-white/5 px-3 rounded-xl transition-all"
                  onClick={() => {
                    setCurrentIndex(index);
                    setActiveTab("home");
                  }}
                >
                  <span className="text-gray-600 text-sm w-5">{index + 1}</span>
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${hook.gradient} border border-white/10 flex items-center justify-center flex-shrink-0`}>
                    <span className="text-[#90e0ef] font-bold">{hook.artist.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{hook.title}</p>
                    <p className="text-sm text-gray-400 truncate">{hook.artist}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    index === 0 ? "bg-red-500/15 text-red-400"       :
                    index === 1 ? "bg-[#90e0ef]/15 text-[#90e0ef]"  :
                                  "bg-green-500/15 text-green-400"
                  }`}>
                    {index === 0 ? "hot" : index === 1 ? "viral" : "new"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PROFILE TAB ═══════════════════════════════════════ */}
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

            {/* Stats */}
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

      {/* ── BOTTOM NAVIGATION ───────────────────────────────────── */}
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
              activeTab === tab.id
                ? "text-[#90e0ef] scale-110"
                : "text-gray-500 hover:text-gray-300"
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