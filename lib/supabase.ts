// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase.ts
// Initializes and exports the single Supabase client used across the entire app.
//
// Supabase powers:
//   • Auth         — email/password sign-up + Google OAuth
//   • Database     — saved_hooks, playlists, playlist_tracks, hook_plays tables
//   • RLS policies — users can only read/write their own rows
//
// NEXT_PUBLIC_ prefix makes these available in the browser bundle.
// They are safe to expose — Supabase RLS enforces all access control server-side.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
