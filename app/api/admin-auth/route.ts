// ─────────────────────────────────────────────────────────────────────────────
// app/api/admin-auth/route.ts
// Validates the admin dashboard password.
//
// Called by: app/admin/page.tsx  →  POST /api/admin-auth  →  { password }
// Returns:   { ok: true } on success  |  401 on wrong password
//
// The password never leaves the server — it lives only in Vercel environment
// variables (ADMIN_PASSWORD) and is compared server-side here.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  // Server-side check — ADMIN_PASSWORD is never sent to the browser
  if (password === process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}