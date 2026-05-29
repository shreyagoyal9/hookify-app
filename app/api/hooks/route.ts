// ─────────────────────────────────────────────────────────────────────────────
// app/api/hooks/route.ts
// Legacy placeholder — no longer used in the main app.
//
// iTunes data is now fetched via:
//   • lib/itunes.ts → searchTrackFast()  for the home feed
//   • app/api/search/route.ts            for the search page
//
// Kept to avoid 404 errors from any old references.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Deprecated — use /api/search or lib/itunes.ts" });
}