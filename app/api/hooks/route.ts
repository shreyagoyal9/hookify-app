// app/api/hooks/route.ts
// We don't use this anymore — iTunes API is called directly from browser
// But we keep this file to avoid build errors

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Use iTunes API directly from browser" });
}