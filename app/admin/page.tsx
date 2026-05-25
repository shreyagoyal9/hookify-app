// app/admin/page.tsx
// Admin analytics dashboard — see who is using Hookify
// Visit: /admin to see all stats

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Stats = {
  totalUsers:    number;
  totalPlays:    number;
  totalSaved:    number;
  totalPlaylists: number;
  topSongs:      { title: string; artist: string; plays: number }[];
  recentPlays:   { title: string; artist: string; played_at: string }[];
};

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);

      // Total users
      const { count: totalUsers } = await supabase
        .from("hook_plays")
        .select("user_id", { count: "exact", head: true });

      // Total plays
      const { count: totalPlays } = await supabase
        .from("hook_plays")
        .select("*", { count: "exact", head: true });

      // Total saved hooks
      const { count: totalSaved } = await supabase
        .from("saved_hooks")
        .select("*", { count: "exact", head: true });

      // Total playlists
      const { count: totalPlaylists } = await supabase
        .from("playlists")
        .select("*", { count: "exact", head: true });

      // Top songs by plays
      const { data: playsData } = await supabase
        .from("hook_plays")
        .select("title, artist");

      // Count plays per song
      const songCounts: Record<string, { title: string; artist: string; plays: number }> = {};
      playsData?.forEach((play) => {
        const key = `${play.title}-${play.artist}`;
        if (!songCounts[key]) {
          songCounts[key] = { title: play.title, artist: play.artist, plays: 0 };
        }
        songCounts[key].plays++;
      });

      const topSongs = Object.values(songCounts)
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      // Recent plays
      const { data: recentData } = await supabase
        .from("hook_plays")
        .select("title, artist, played_at")
        .order("played_at", { ascending: false })
        .limit(10);

      setStats({
        totalUsers:    totalUsers ?? 0,
        totalPlays:    totalPlays ?? 0,
        totalSaved:    totalSaved ?? 0,
        totalPlaylists: totalPlaylists ?? 0,
        topSongs:      topSongs,
        recentPlays:   recentData ?? [],
      });

      setLoading(false);
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <p className="text-[#90e0ef] animate-pulse">loading analytics...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white p-8">
      <h1 className="text-3xl text-[#90e0ef] mb-2" style={{ fontFamily: "cursive" }}>
        Hookify Admin 🐘
      </h1>
      <p className="text-gray-400 text-sm mb-8">real-time analytics dashboard</p>

      {/* ── STATS CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "total plays",     value: stats?.totalPlays,     icon: "🎵" },
          { label: "saved hooks",     value: stats?.totalSaved,     icon: "❤️" },
          { label: "playlists made",  value: stats?.totalPlaylists, icon: "🎵" },
          { label: "play sessions",   value: stats?.totalUsers,     icon: "👤" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#131929] rounded-2xl p-5 border border-white/10">
            <p className="text-3xl mb-2">{stat.icon}</p>
            <p className="text-2xl font-medium text-[#90e0ef]">{stat.value ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── TOP SONGS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#131929] rounded-2xl p-5 border border-white/10">
          <h2 className="text-base font-medium mb-4 text-[#90e0ef]">🔥 most played hooks</h2>
          {stats?.topSongs.length === 0 ? (
            <p className="text-gray-500 text-sm">no plays yet!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {stats?.topSongs.map((song, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                  </div>
                  <span className="text-xs text-[#90e0ef] bg-[#90e0ef]/10 px-2 py-1 rounded-full">
                    {song.plays} plays
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RECENT PLAYS ──────────────────────────────────────── */}
        <div className="bg-[#131929] rounded-2xl p-5 border border-white/10">
          <h2 className="text-base font-medium mb-4 text-[#90e0ef]">⏱️ recent plays</h2>
          {stats?.recentPlays.length === 0 ? (
            <p className="text-gray-500 text-sm">no plays yet!</p>
          ) : (
            <div className="flex flex-col gap-3">
              {stats?.recentPlays.map((play, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{play.title}</p>
                    <p className="text-xs text-gray-400 truncate">{play.artist}</p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(play.played_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}