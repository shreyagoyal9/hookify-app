// ─────────────────────────────────────────────────────────────────────────────
// app/layout.tsx
// Root layout — applied to every page in the app.
//
// Responsibilities:
//   1. Set page metadata: title, description, favicon
//   2. Lock mobile viewport so users can't pinch-zoom
//   3. Apply global dark background and `h-dvh` (dynamic viewport height)
//      so the app fills the screen on iOS Safari correctly
//
// Notes:
//   - `metadata` and `viewport` must be separate exports in Next.js 14+
//   - `overflow-hidden` on body prevents page-level scroll (mobile feeds scroll internally)
//   - `h-dvh` accounts for iOS Safari's collapsible address bar
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hookify — just the hook",
  description: "15 seconds. the hook. skip everything else.",
  icons: {
    icon: "/Elephant_Beats.jpeg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0a0e1a] antialiased overflow-hidden h-dvh">
        {children}
      </body>
    </html>
  );
}