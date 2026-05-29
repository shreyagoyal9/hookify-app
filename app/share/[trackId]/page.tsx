// ─────────────────────────────────────────────────────────────────────────────
// app/share/[trackId]/page.tsx
// Public shareable hook card — no login required.
//
// URL:  /share/[trackId]?title=...&artist=...&art=...&url=...&start=...&end=...
//
// All track data is encoded in URL search params so the page works without
// any database lookup. The `trackId` segment exists for semantic URLs only.
//
// ShareContent is wrapped in <Suspense> because useSearchParams() requires
// a Suspense boundary in Next.js App Router (throws without it).
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

function ShareContent({ params }: { params: { trackId: string } }) {
  const searchParams  = useSearchParams();
  const title         = searchParams.get("title")  ?? "Unknown Title";
  const artist        = searchParams.get("artist") ?? "Unknown Artist";
  const art           = searchParams.get("art")    ?? "";
  const previewUrl    = searchParams.get("url")    ?? "";
  const hookStart     = Number(searchParams.get("start") ?? 5);
  const hookEnd       = Number(searchParams.get("end")   ?? 20);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Play / pause hook audio ────────────────────────────────────
  // Seeks to hookStart on play; stops automatically at hookEnd
  const togglePlay = () => {
    if (!previewUrl) return;
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    if (!audioRef.current || audioRef.current.src !== previewUrl) {
      audioRef.current?.pause();
      audioRef.current = new Audio(previewUrl);
      audioRef.current.currentTime = hookStart;
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && audioRef.current.currentTime >= hookEnd) {
          audioRef.current.pause();
          audioRef.current.currentTime = hookStart;
          setIsPlaying(false);
        }
      };
      audioRef.current.onended = () => setIsPlaying(false);
    }
    audioRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  useEffect(() => () => { audioRef.current?.pause(); }, []);

  const handleOpenInApp = () => { window.location.href = "/home"; };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `🎵 Check out the hook of "${title}" by ${artist} on Hookify — just 15 seconds!`;
    if (navigator.share) {
      await navigator.share({ title: "Hookify Hook", text, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [copied, setCopied] = useState(false);

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white flex flex-col items-center justify-center px-4 py-8">
      {/* Brand */}
      <a href="/home" className="mb-8 flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
        <Image src="/Elephant_Beats.jpeg" alt="Hookify" width={28} height={28} className="rounded-full border border-[#90e0ef]/40" />
        <span className="text-[#90e0ef] text-lg" style={{ fontFamily: "cursive" }}>Hookify</span>
      </a>

      {/* Hook card */}
      <div className="w-full max-w-sm bg-gradient-to-br from-[#0e2a3b] via-[#131929] to-[#0a0e1a] rounded-3xl border border-[#90e0ef]/20 p-8 text-center shadow-[0_0_60px_rgba(144,224,239,0.15)]">
        {/* Vinyl */}
        <div className="flex justify-center mb-6">
          <div className={`w-40 h-40 rounded-full border-2 border-[#90e0ef]/30 flex items-center justify-center ${isPlaying ? "animate-spin" : ""}`}
            style={{ animationDuration: "4s" }}>
            <div className="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center overflow-hidden"
              style={{ background: "radial-gradient(circle, #1a1a2e 30%, #0d0d1a 60%, #1a1a2e 80%)" }}>
              {art ? (
                <img src={art} alt={title} className="w-20 h-20 rounded-full object-cover border-2 border-[#90e0ef]/50 shadow-[0_0_20px_rgba(144,224,239,0.3)]" />
              ) : (
                <span className="text-4xl">🎵</span>
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-[#90e0ef]/60 uppercase tracking-widest mb-2">shared hook</p>
        <h1 className="text-xl font-medium mb-1 truncate">{title}</h1>
        <p className="text-[#90e0ef] text-sm mb-1 truncate">{artist}</p>
        <p className="text-gray-500 text-xs mb-6">🤖 hook: {hookStart}s – {hookEnd}s</p>

        {/* Play button */}
        {previewUrl && (
          <button onClick={togglePlay}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-6 transition-all duration-300 ${
              isPlaying
                ? "bg-[#90e0ef] text-[#0a0e1a] scale-110 shadow-[0_0_30px_rgba(144,224,239,0.6)]"
                : "bg-white/10 text-white hover:bg-[#90e0ef]/20 border border-white/20"
            }`}>
            {isPlaying ? "⏸" : "▶"}
          </button>
        )}

        {/* CTAs */}
        <button onClick={handleOpenInApp}
          className="w-full py-3 rounded-full bg-[#90e0ef] text-[#0a0e1a] font-bold text-sm hover:opacity-90 transition-all mb-3">
          open in Hookify 🐘
        </button>
        <button onClick={handleShare}
          className="w-full py-3 rounded-full border border-[#90e0ef]/30 text-[#90e0ef] text-sm hover:bg-[#90e0ef]/10 transition-all">
          {copied ? "link copied! ✅" : "share this hook 📤"}
        </button>
      </div>

      <p className="text-gray-600 text-xs mt-6 text-center">
        just the hook. 15 seconds. the best part.
      </p>
    </main>
  );
}

export default function SharePage({ params }: { params: { trackId: string } }) {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <p className="text-[#90e0ef] animate-pulse">loading hook...</p>
      </main>
    }>
      <ShareContent params={params} />
    </Suspense>
  );
}
