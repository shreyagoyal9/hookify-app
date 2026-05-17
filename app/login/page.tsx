// app/login/page.tsx
// This is the LOGIN / SIGNUP page
// Users can switch between Login and Signup using the tab buttons

"use client"; // Runs in the browser

import { useState } from "react"; // useState lets us track which tab is active
import { useRouter } from "next/navigation"; // For navigating to home after login
import Image from "next/image"; // Optimized image from Next.js

export default function LoginPage() {
  // Track which tab user is on: "login" or "signup"
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  // Track what user types in the form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");

  // Router to navigate to home page after successful login
  const router = useRouter();

  // This runs when user clicks Login or Signup button
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Stop page from refreshing

    // For now we just go to home page (we'll add real auth later)
    router.push("/home");
  };

  return (
    // Full screen dark background, everything centered
    <main className="min-h-screen bg-[#0b1623] flex flex-col items-center justify-center">

      {/* Hookify brand name */}
      <h1 className="text-5xl mb-8 text-[#90e0ef]" style={{ fontFamily: "cursive" }}>
        Hookify
      </h1>

      {/* Auth card — the white box in the middle */}
      
<div className="bg-[#0e2a3b] rounded-3xl p-10 flex flex-col items-center w-[420px] shadow-lg hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(144,224,239,0.4)] transition-all duration-300">
        {/* Elephant logo */}
        <Image
          src="/Elephant_Beats.jpeg"
          alt="Hookify Logo"
          width={70}
          height={70}
          className="rounded-full mb-6 border-2 border-[#90e0ef] hover:scale-110 transition-transform duration-300"
        />

        {/* Login / Signup tab switcher */}
        <div className="flex gap-3 w-full mb-6">
          {/* Login tab button */}
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2 rounded-full text-sm transition-all duration-300 ${
              activeTab === "login"
                ? "bg-[#90e0ef] text-[#0b1623] font-bold" // active style
                : "bg-[#0b1623] text-gray-400"             // inactive style
            }`}
          >
            Login
          </button>

          {/* Signup tab button */}
          <button
            onClick={() => setActiveTab("signup")}
            className={`flex-1 py-2 rounded-full text-sm transition-all duration-300 ${
              activeTab === "signup"
                ? "bg-[#90e0ef] text-[#0b1623] font-bold"
                : "bg-[#0b1623] text-gray-400"
            }`}
          >
            Signup
          </button>
        </div>

        {/* Form — email, password, and optional re-enter password */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">

          {/* Email input */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-full bg-[#0b1623] border border-[#90e0ef33] text-white placeholder-gray-500 outline-none focus:border-[#90e0ef] transition-colors"
          />

          {/* Password input */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-full bg-[#0b1623] border border-[#90e0ef33] text-white placeholder-gray-500 outline-none focus:border-[#90e0ef] transition-colors"
          />

          {/* Re-enter password — only shown on Signup tab */}
          {activeTab === "signup" && (
            <input
              type="password"
              placeholder="Re-enter Password"
              value={rePassword}
              onChange={(e) => setRePassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-full bg-[#0b1623] border border-[#90e0ef33] text-white placeholder-gray-500 outline-none focus:border-[#90e0ef] transition-colors"
            />
          )}

          {/* Submit button — says Login or Signup depending on active tab */}
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-[#90e0ef] text-[#0b1623] font-bold text-base hover:opacity-90 transition-opacity mt-1"
          >
            {activeTab === "login" ? "Login" : "Signup"}
          </button>

          {/* Google login button */}
          <button
            type="button"
            className="w-full py-3 rounded-full bg-white text-[#0b1623] font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            {/* Google G logo — inline SVG so it always works, no external URL needed */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        

        {/* Terms text */}
        <p className="text-gray-500 text-xs mt-4 text-center">
          By signing up, you agree to our{" "}
          <a href="#" className="text-[#90e0ef] font-bold">
            Terms & Privacy
          </a>
        </p>
      </div>
    </main>
  );
}