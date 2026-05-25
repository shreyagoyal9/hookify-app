# 🐘 Hookify

> **just the hook.** 15 seconds. the best part. skip everything else.

Hookify is a TikTok-style music app for Gen Z and Gen Alpha who don't have time for full songs — they just want the hook. Swipe through the catchiest parts of trending songs, save your favorites, and vibe with our elephant mascot.

---

## 🎵 What is Hookify?

People love scrolling Reels and Shorts. They love the *hook* of a song — that 15-second part that gets stuck in your head. But no app gives you *just* the hook.

**Hookify does.**

- 🎧 Plays only the hook part of trending songs
- 📱 TikTok-style swipe interface
- 🎵 Real audio previews via iTunes API
- 🐘 Cute elephant mascot that vibes when music plays
- ❤️ Save your favorite hooks
- 🔥 Trending hooks feed

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎵 Hook Playback | Plays only the catchiest part of each song (not the full 30s) |
| 📱 Swipe Feed | Drag cards left/right like TikTok to discover hooks |
| 💿 Spinning Vinyl | Beautiful rotating vinyl with real album art in the center |
| 🐘 Vibing Elephant | Mascot bounces and glows when music is playing |
| 🎮 Elephant Control | Tap the elephant in top right to play/pause music |
| ❤️ Save Hooks | Like and save your favorite hooks |
| 🔥 Trending Tab | See what hooks are viral this week |
| 💾 Saved Tab | Access all your saved hooks in one place |
| 👤 Profile | See your listening stats |
| 🌐 Live on Vercel | Deployed and accessible from anywhere |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Audio | iTunes Search API (free, no key needed) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + Google OAuth |
| Deployment | Vercel |
| Version Control | GitHub |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn
- A Supabase account (free)

### Installation

```bash
# Clone the repository
git clone https://github.com/shreyagoyal9/hookify-app.git

# Navigate into the project
cd hookify-app

# Install dependencies
npm install

# Create environment file
touch .env.local
```

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
hookify-app/
├── app/
│   ├── page.tsx          # Loading screen
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles
│   ├── login/
│   │   └── page.tsx      # Login / Signup page
│   ├── home/
│   │   └── page.tsx      # Main TikTok-style feed
│   └── api/
│       └── hooks/
│           └── route.ts  # API route
├── components/           # Reusable components (coming soon)
├── lib/
│   ├── itunes.ts         # iTunes API integration
│   └── supabase.ts       # Supabase client
├── public/
│   └── Elephant_Beats.jpeg  # Hookify mascot
└── README.md
```

## 🗺️ Roadmap

- [x] Loading screen with elephant mascot
- [x] Login / Signup page
- [x] TikTok-style swipe feed
- [x] Spinning vinyl with real album art
- [x] Real audio via iTunes API
- [x] Hook timestamp detection (manual)
- [x] Save / like hooks
- [x] Trending feed
- [x] Deploy to Vercel
- [x] Real Supabase authentication
- [x] Google OAuth login
- [x] AI Hook Detection (Python + librosa) 
- [x] Bollywood / regional music support via YouTube trending
- [x] Auto-updating trending feed via YouTube Data API
- [x] AI server deployed on Railway
- [ ] Share hooks to Instagram / WhatsApp
- [ ] Custom playlists
- [ ] Artist pages

---

## 🤖 AI Hook Detection (Coming Soon)

The most exciting part of Hookify is the **AI Hook Detector** — a Python model that:

1. Takes any song as input
2. Analyzes audio features using `librosa`
3. Detects the most repeated / energetic section
4. Returns the exact timestamp of the hook

This replaces our current manual timestamp system and is being built as an AIML project.

**Tech:** Python, librosa, numpy, scikit-learn

---

## 👩‍💻 About the Developer

Built by **Shreya Goyal** — Web Development + AIML student.

- 🐙 GitHub: [@shreyagoyal9](https://github.com/shreyagoyal9)
- 🌐 Live App: [hookify-app-chi.vercel.app](https://hookify-app-chi.vercel.app)

---

## 📸 Screenshots

*Coming soon — app is being polished!*

---

## 📄 License

MIT License — feel free to use this project for learning!

---

<div align="center">
  Made with 🐘 and 🎵 by Shreya Goyal
</div>
