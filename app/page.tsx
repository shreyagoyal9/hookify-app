// app/page.tsx
// This is the LOADING SCREEN — the first thing users see when they open Hookify
// After 3 seconds it automatically takes them to the login page

"use client"; // This tells Next.js this page runs in the browser (not server)

import { useEffect } from "react"; // useEffect runs code after the page loads
import { useRouter } from "next/navigation"; // useRouter lets us navigate between pages
import Image from "next/image"; // Next.js optimized image component

export default function LoadingPage() {
  // useRouter gives us the ability to move to another page programmatically
  const router = useRouter();

  // useEffect runs once when the page loads (the [] at the end means "run once")
  useEffect(() => {
    // Wait 3 seconds then redirect to the login page
    const timer = setTimeout(() => {
      router.push("/login"); // "/login" maps to app/login/page.tsx
    }, 3000);

    // Cleanup: if user leaves before 3 seconds, cancel the timer
    return () => clearTimeout(timer);
  }, [router]);

  return (
    // Full screen dark blue background, everything centered
    <main className="min-h-screen bg-[#0b1623] flex flex-col items-center justify-center">

      {/* Hookify brand name in big cursive font */}
      <h1 className="text-5xl mb-8 text-[#90e0ef]" style={{ fontFamily: "cursive" }}>
        Hookify
      </h1>

      {/* White card in the center */}
      <div className="bg-[#0e2a3b] rounded-3xl p-10 flex flex-col items-center w-80 shadow-lg">

        {/* Elephant logo — the face of Hookify */}
        <Image
          src="/Elephant_Beats.jpeg"
          alt="Hookify Elephant Logo"
          width={80}
          height={80}
          className="rounded-full mb-6 border-2 border-[#90e0ef]"
        />

        {/* Simple loading text */}
        <p className="text-[#90e0ef] text-sm mb-6 tracking-widest uppercase">
          Loading your hooks...
        </p>

        {/* Animated loading bar with a music note sliding across */}
        <div className="w-full h-3 bg-[#112d44] rounded-full overflow-hidden relative">
          <div className="absolute top-0 left-0 h-full w-10 bg-[#90e0ef] rounded-full animate-slide flex items-center justify-center text-xs">
            🎵
          </div>
        </div>
      </div>
    </main>
  );
}