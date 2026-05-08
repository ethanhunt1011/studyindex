# StudyIndex — AI Study Planner

An AI-powered study planner that transforms any textbook index or study material into a structured, personalised plan. Built with React, Express, Google Gemini AI, and Firebase.

## Features

- **AI Study Plan Generation** — Upload a PDF, image, or text file and Gemini AI extracts a full Unit → Chapter → Topic hierarchy with difficulty ratings, estimated times, and revision schedules.
- **Study Buddy Chat** — Multi-session chat to ask questions about your uploaded document.
- **AI Summarisation** — One-click summary of uploaded study material.
- **Focus Timer** — Pomodoro-style timer with Deep Focus mode and a liquid-fill animation.
- **Progress Tracking** — Mark topics as complete; progress is persisted locally via Capacitor Preferences.
- **Streak Counter** — Tracks consecutive study days and awards badges.
- **Flashcard Generator** — Auto-generates Q&A flashcards for any topic.
- **Scheduled Sessions** — Schedule study sessions and export to Google Calendar.
- **Dark / Day Theme** — Fully themeable UI.
- **Android Support** — Capacitor integration for native Android builds.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Animations | Framer Motion |
| Backend | Express.js (TypeScript) |
| AI | Google Gemini (`@google/genai`) |
| Auth & DB | Firebase Auth + Firestore |
| Mobile | Capacitor (Android) |
| Local Storage | Capacitor Preferences |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- A Firebase project with Firestore and Authentication enabled

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/studyindex.git
cd studyindex
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Gemini API key:

```
GEMINI_API_KEY="your_gemini_api_key_here"
VITE_GEMINI_API_KEY="your_gemini_api_key_here"
```

### 4. Set up Firebase config

```bash
cp firebase-applet-config.example.json firebase-applet-config.json
```

Fill in your Firebase project credentials in `firebase-applet-config.json`.

### 5. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for production

```bash
npm run build
```

### 7. Android build (optional)

```bash
npm run android:sync
npm run android:open
```

## Project Structure

```
├── src/
│   ├── App.tsx                  # Root component & global state
│   ├── components/
│   │   ├── DashboardContent.tsx # Main dashboard UI
│   │   └── Layout.tsx           # Navigation shell
│   ├── pages/
│   │   ├── Dashboard.tsx        # Dashboard route wrapper
│   │   └── index.tsx            # Analytics, StudyRooms, StudyBuddy, Settings
│   ├── services/
│   │   └── gemini.ts            # Client-side Gemini helpers
│   └── lib/
│       ├── firebase.ts          # Firebase init & auth helpers
│       ├── storage.ts           # Capacitor Preferences wrapper
│       └── utils.ts             # Utility functions
├── server.ts                    # Express API (Gemini proxy + rate limiting)
├── firebase-applet-config.example.json
├── firestore.rules
└── capacitor.config.ts
```

## Security Notes

- The Gemini API key is **never exposed to the browser** — all AI calls are proxied through the Express server.
- Firebase credentials live in `firebase-applet-config.json`, which is in `.gitignore`. Copy `firebase-applet-config.example.json` and fill in your own values.
- The server includes an in-memory rate limiter (50 req / min per IP).

## License

MIT
