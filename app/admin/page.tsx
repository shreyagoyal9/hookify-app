// app/admin/page.tsx
// Admin analytics dashboard — see all users and their activity
// Visit: /admin to see all stats

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserStat = {
  email: string;
  joined_at: string;
  total_plays: number;
  total_saved: number;
  total_playlists: number;
};

type Stats = {
  totalUsers:     number;
  totalPlays:     number;
  totalSaved:     number;
  totalPlaylists: number;
  topSongs:       { title: string; artist: string; plays: number }[];
  recentPlays:    { title: string; artist: string; user_email: string; played_at: string }[];
  users:          UserStat[];
};

const ADMIN_PASSWORD = "hookify2024";

export default function AdminPage() {
  const [authed, setAuthed]         = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const handleLogin = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAuthed(true);
      setPasswordError("");
    } else {
      setPasswordError("Wrong password. Try again.");
      setPasswordInput("");
    }
  };

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);

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

      // All plays data for top songs
      const { data: playsData } = await supabase
        .from("hook_plays")
        .select("title, artist, user_email, played_at")
        .order("played_at", { ascending: false });

      // Count plays per song
      const songCounts: Record<string, { title: string; artist: string; plays: number }> = {};
      playsData?.forEach((play) => {
        const key = `${play.title}-${play.artist}`;
        if (!songCounts[key]) songCounts[key] = { title: play.title, artist: play.artist, plays: 0 };
        songCounts[key].plays++;
      });

      const topSongs = Object.values(songCounts)
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      // Recent plays
      const recentPlays = (playsData ?? []).slice(0, 10).map((p) => ({
        title:      p.title,
        artist:     p.artist,
        user_email: p.user_email ?? "anonymous",
        played_at:  p.played_at,
      }));

      // User stats from view
      const { data: usersData } = await supabase
        .from("user_stats")
        .select("*");

      setStats({
        totalUsers:     usersData?.length ?? 0,
        totalPlays:     totalPlays ?? 0,
        totalSaved:     totalSaved ?? 0,
        totalPlaylists: totalPlaylists ?? 0,
        topSongs,
        recentPlays,
        users:          usersData ?? [],
      });

      setLoading(false);
    }

    fetchStats();
  }, []);

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center px-4">
        <div className="bg-[#0e2a3b] rounded-3xl p-8 w-full max-w-sm border border-[#90e0ef]/20 text-center">
          <h1 className="text-2xl text-[#90e0ef] mb-2" style={{ fontFamily: "cursive" }}>Hookify Admin 🐘</h1>
          <p className="text-gray-400 text-sm mb-6">enter the admin password to continue</p>
          <input
            type="password"
            placeholder="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-4 py-3 rounded-full bg-[#0a0e1a] border border-[#90e0ef]/30 text-white text-sm outline-none focus:border-[#90e0ef] mb-3"
          />
          {passwordError && <p className="text-red-400 text-xs mb-3">{passwordError}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-3 rounded-full bg-[#90e0ef] text-[#0a0e1a] font-bold text-sm hover:opacity-90 transition-all">
            enter
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0e1a] text-white flex items-center justify-center">
        <p className="text-[#90e0ef] animate-pulse">loading analytics...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0e1a] text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <h1 className="text-3xl text-[#90e0ef] mb-1" style={{ fontFamily: "cursive" }}>
          Hookify Admin 🐘
        </h1>
        <p className="text-gray-400 text-sm mb-8">real-time analytics dashboard</p>

        {/* ── STATS CARDS ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "total users",    value: stats?.totalUsers,     icon: "👤" },
            { label: "total plays",    value: stats?.totalPlays,     icon: "🎵" },
            { label: "saved hooks",    value: stats?.totalSaved,     icon: "❤️" },
            { label: "playlists made", value: stats?.totalPlaylists, icon: "🎵" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#131929] rounded-2xl p-5 border border-white/10">
              <p className="text-3xl mb-2">{stat.icon}</p>
              <p className="text-2xl font-medium text-[#90e0ef]">{stat.value ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── TABS ──────────────────────────────────────────────── */}
        <div className="flex gap-3 mb-6">
          {["overview", "users", "recent"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                activeTab === tab
                  ? "bg-[#90e0ef] text-[#0a0e1a] font-bold"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="bg-[#131929] rounded-2xl p-5 border border-white/10">
            <h2 className="text-base font-medium mb-4 text-[#90e0ef]">🔥 most played hooks</h2>
            {stats?.topSongs.length === 0 ? (
              <p className="text-gray-500 text-sm">no plays yet — play some songs!</p>
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
        )}

        {/* ── USERS TAB ─────────────────────────────────────────── */}
        {activeTab === "users" && (
          <div className="bg-[#131929] rounded-2xl p-5 border border-white/10">
            <h2 className="text-base font-medium mb-4 text-[#90e0ef]">👤 all users</h2>
            {stats?.users.length === 0 ? (
              <p className="text-gray-500 text-sm">no users yet!</p>
            ) : (
              <div className="flex flex-col gap-3">
                {stats?.users.map((user, i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-white/5">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#90e0ef]/20 border border-[#90e0ef]/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#90e0ef] font-bold text-sm">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        joined {new Date(user.joined_at).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Stats */}
                    <div className="flex gap-3 text-xs flex-shrink-0">
                      <div className="text-center">
                        <p className="text-[#90e0ef] font-medium">{user.total_plays}</p>
                        <p className="text-gray-500">plays</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#90e0ef] font-medium">{user.total_saved}</p>
                        <p className="text-gray-500">saved</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[#90e0ef] font-medium">{user.total_playlists}</p>
                        <p className="text-gray-500">playlists</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RECENT PLAYS TAB ──────────────────────────────────── */}
        {activeTab === "recent" && (
          <div className="bg-[#131929] rounded-2xl p-5 border border-white/10">
            <h2 className="text-base font-medium mb-4 text-[#90e0ef]">⏱️ recent plays</h2>
            {stats?.recentPlays.length === 0 ? (
              <p className="text-gray-500 text-sm">no plays yet!</p>
            ) : (
              <div className="flex flex-col gap-3">
                {stats?.recentPlays.map((play, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{play.title}</p>
                      <p className="text-xs text-gray-400 truncate">{play.artist}</p>
                      <p className="text-xs text-gray-600 truncate">{play.user_email}</p>
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(play.played_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}