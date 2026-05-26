# 🐘 Hookify

<div align="center">

<img src="public/Elephant_Beats.jpeg" alt="Hookify Logo" width="20"/>

### *just the hook. 15 seconds. the best part. skip everything else.*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-hookify--app--chi.vercel.app-90e0ef?style=for-the-badge)](https://hookify-app-chi.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-shreyagoyal9-181717?style=for-the-badge&logo=github)](https://github.com/shreyagoyal9/hookify-app)
[![Railway](https://img.shields.io/badge/AI%20Server-Railway-blueviolet?style=for-the-badge)](https://web-production-c2177.up.railway.app/docs)

</div>

---

## 🎯 The Problem

You open Spotify. A 3-minute song plays. You wait... and wait... for that **one moment** — the hook — the 15 seconds that made you love the song.

**Gen Z and Gen Alpha don't wait.** They swipe Reels. They watch Shorts. They want the best part, right now.

**Hookify gives them exactly that.**

---

## ✨ What is Hookify?

Hookify is a **TikTok-style music app** that plays only the hook (catchiest part) of trending songs — powered by a custom AI model that automatically detects where the hook starts and ends in any song.

> 📸 **[Loading screen with elephant mascot]**
> <img width="380" height="244" alt="Screenshot 2026-05-26 at 3 02 45 PM" src="https://github.com/user-attachments/assets/7eee7ed0-8836-47cc-9b33-f5a6e38c4bab" />


---

## 🚀 Live Demo

👉 **[hookify-app-chi.vercel.app](https://hookify-app-chi.vercel.app)**

- Sign up with email or Google
- Swipe through today's globally trending hooks
- Search any song — AI detects the hook automatically
- Save your favorite hooks
- Create playlists

---

## 📱 Screenshots

> 📸 **[ADD SCREENSHOT: Login page]**

> 📸 **[ADD SCREENSHOT: Home feed with spinning vinyl]**

> 📸 **[ADD SCREENSHOT: Search page with AI timestamps]**

> 📸 **[ADD SCREENSHOT: Full card view with loop button]**

> 📸 **[ADD SCREENSHOT: Saved hooks tab]**

> 📸 **[ADD SCREENSHOT: Playlists tab]**

> 📸 **[ADD SCREENSHOT: Admin dashboard]**

---

## 🧠 How the AI Works

This is the most unique part of Hookify — a **custom audio analysis model** built from scratch using Python.

Any song URL
↓
Download 30s preview (iTunes API)
↓
Convert to WAV (ffmpeg)
↓
Extract audio features (librosa):
• RMS Energy     → measures loudness/energy at each moment
• Spectral Centroid → measures brightness/melody
• Onset Strength → measures rhythmic activity
↓
Combine into "hookiness score" per frame
hookiness = 0.5×energy + 0.3×melody + 0.2×rhythm
↓
Slide 15-second window across song
Find window with highest average hookiness
↓
Return { hook_start: 14.7s, hook_end: 29.7s }

> 📸 **[ADD SCREENSHOT: Browser console showing 🤖 AI hook timestamps]**

The model runs on a **FastAPI server deployed on Railway**, called automatically when any song loads.

---

## 🏗️ System Architecture
```text
┌─────────────────────────────────────────────────────┐
│                    USER                             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│          Next.js Frontend (Vercel)                  │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │  Login   │  │  Home    │  │     Search       │   │
│  │ Supabase │  │  Swipe   │  │  Full Card View  │   │
│  │  Auth    │  │  Feed    │  │  Swipe Gestures  │   │
│  └──────────┘  └──────────┘  └──────────────────┘   │
└──────┬──────────────┬───────────────────┬───────────┘
       │              │                   │
       ▼              ▼                   ▼
┌──────────┐  ┌──────────────┐  ┌────────────────────┐
│ Supabase │  │  iTunes API  │  │  Railway AI Server │
│          │  │              │  │                    │
│ • Users  │  │ • Song data  │  │  Python + FastAPI  │
│ • Saved  │  │ • 30s audio  │  │  librosa analysis  │
│ • Plays  │  │ • Album art  │  │  ffmpeg conversion │
│ • Lists  │  └──────────────┘  └────────────────────┘
└──────────┘
    ▲
    │
┌──────────────┐
│ YouTube API  │
│              │
│ Trending     │
│ music feed   │
│ (auto-update)│
└──────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16 + TypeScript | App framework |
| Styling | Tailwind CSS | UI design |
| Animations | Framer Motion | Swipe gestures, transitions |
| Audio | iTunes Search API | Free 30s song previews |
| AI Model | Python + librosa | Hook detection algorithm |
| AI Server | FastAPI + uvicorn | REST API for AI |
| Audio Processing | ffmpeg | Convert m4a to wav |
| Trending Data | YouTube Data API v3 | Real trending songs |
| Database | Supabase (PostgreSQL) | Users, saves, playlists |
| Authentication | Supabase Auth + Google OAuth | Login system |
| Frontend Deploy | Vercel | Auto-deploys on git push |
| AI Deploy | Railway | Python server hosting |
| Version Control | GitHub | Code + collaboration |

---

## ✅ Features

### 🎵 Core Features
- **Hook Detection AI** — Custom librosa model detects the hook of ANY song automatically
- **TikTok-style swipe feed** — Drag cards left/right to discover hooks
- **Spinning vinyl** — Beautiful rotating vinyl with real album art from iTunes
- **Real audio** — Plays the actual hook section (not the full song)
- **Loop mode** — Loop the hook continuously 🔁

### 🔍 Search
- Search any song or artist in the world
- Results appear instantly
- AI detects hook timestamps in the background
- Full card view with swipe gestures (swipe up = next song, swipe down = close)

### 👤 User Features
- Email signup / Google OAuth login
- Save favorite hooks ❤️
- Create multiple playlists
- Share hooks with friends 📤
- Profile with listening stats

### 📊 Admin Dashboard
- Real-time user analytics
- Most played hooks
- Recent plays with user emails
- Total users, plays, saves, playlists

### 🔥 Trending
- Auto-updates daily with globally trending music from YouTube
- Works for ALL languages — English, Hindi, Korean, Spanish, anything!

---

## 🚀 Getting Started (For Developers)

### Prerequisites
Node.js v18+
Python 3.9+
npm
pip

### 1. Clone the repo
```bash
git clone https://github.com/shreyagoyal9/hookify-app.git
cd hookify-app
```

### 2. Install dependencies
```bash
# Next.js dependencies
npm install

# Python AI dependencies
pip install librosa numpy scipy fastapi uvicorn python-multipart httpx static-ffmpeg
```

### 3. Set up environment variables
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
YOUTUBE_API_KEY=your_youtube_api_key
```

### 4. Set up Supabase
Run these SQL queries in Supabase SQL Editor:
```sql
-- Saved hooks table
create table saved_hooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  track_id bigint, title text, artist text, album text,
  album_art text, preview_url text, hook_start integer,
  hook_end integer, gradient text,
  created_at timestamp with time zone default now()
);

-- Playlists table
create table playlists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Hook plays tracking
create table hook_plays (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text, track_id bigint,
  title text, artist text,
  played_at timestamp with time zone default now()
);
```

### 5. Start the AI server
```bash
cd hookify-ai  # or from hookify-app root
uvicorn api:app --reload --port 8000
```

### 6. Start the Next.js app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Project Structure
```text
hookify-app/
├── app/
│   ├── page.tsx              # Loading screen
│   ├── layout.tsx            # Root layout
│   ├── login/
│   │   └── page.tsx          # Login / Signup
│   ├── home/
│   │   └── page.tsx          # Main TikTok feed
│   ├── search/
│   │   └── page.tsx          # Search with full card view
│   ├── admin/
│   │   └── page.tsx          # Analytics dashboard
│   └── api/
│       ├── trending/         # YouTube trending endpoint
│       ├── search/           # iTunes search proxy
│       └── detect-hook/      # AI hook detection bridge
├── lib/
│   ├── itunes.ts             # iTunes API + AI integration
│   └── supabase.ts           # Supabase client
├── public/
│   └── Elephant_Beats.jpeg   # Hookify mascot 🐘
├── detect_hook.py            # AI hook detection model
├── api.py                    # FastAPI server
└── requirements.txt          # Python dependencies
```
---

## 🗺️ Roadmap

- [x] Loading screen with elephant mascot
- [x] Login / Signup — Supabase Auth
- [x] Google OAuth login
- [x] TikTok-style swipe feed
- [x] Spinning vinyl with real album art
- [x] Real audio — iTunes API
- [x] AI Hook Detection — librosa + FastAPI
- [x] AI server deployed on Railway
- [x] YouTube trending — auto-updates daily
- [x] Search any song — AI detects hook instantly
- [x] Full card view with swipe gestures
- [x] Loop mode 🔁
- [x] Save / like hooks — persists in database
- [x] Playlists — create, add, delete
- [x] Share button
- [x] Admin analytics dashboard
- [x] Play tracking with user emails
- [x] Deployed on Vercel
- [ ] Mobile app (React Native)
- [ ] Improved AI model with more audio features
- [ ] Social features — follow friends, see what they're listening to
- [ ] Artist pages
- [ ] Offline mode

---

## 🤖 AI Hook Detection — Technical Deep Dive

For those interested in the ML side:

### Audio Features Used

**1. RMS Energy (50% weight)**
```python
rms = librosa.feature.rms(y=y)[0]
# Measures loudness at each frame
# Hooks are usually louder/more energetic
```

**2. Spectral Centroid (30% weight)**
```python
spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
# Measures "brightness" of sound
# Higher = more treble = typically more melodic
```

**3. Onset Strength (20% weight)**
```python
onset_strength = librosa.onset.onset_strength(y=y, sr=sr)
# Measures rhythmic activity
# High = lots of beats = energetic section
```

### Hook Finding Algorithm
```python
# Combine features into hookiness score
hookiness = 0.5 * rms + 0.3 * spectral_centroid + 0.2 * onset_strength

# Slide 15-second window across song
# Find window with highest average hookiness
best_start = argmax(sliding_window_mean(hookiness, window=15s))
```

### Future Improvements (Option B)
- Train on labeled dataset of known hooks
- Add melody repetition detection
- Use lyrics timestamps for hook identification
- Fine-tune weights using user feedback data

---

## 👩‍💻 About the Developers

Built by **Shreya Goyal** and **Shansit** — Web Development + AIML students.

- 🐙 GitHub: [@shreyagoyal9](https://github.com/shreyagoyal9)
- 🌐 Live App: [hookify-app-chi.vercel.app](https://hookify-app-chi.vercel.app)
- 🤖 AI API Docs: [web-production-c2177.up.railway.app/docs](https://web-production-c2177.up.railway.app/docs)

---

## 📄 License

MIT License — feel free to use this project for learning!

---

<div align="center">

Made with 🐘 and 🎵 by Shreya Goyal & Shansit Suman.

*just the hook. always.*

</div>
