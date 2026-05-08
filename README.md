# StudyIndex — AI Study Planner

> An intelligent, adaptive study companion powered by Gemini 2.5 Flash, Retrieval-Augmented Generation, the SuperMemo SM-2 spaced-repetition algorithm, and Ebbinghaus forgetting-curve modelling.

**Live demo:** [studyindex.onrender.com](https://studyindex.onrender.com)

---

## What it does

StudyIndex turns any study document — a PDF, a scanned image, or a plain text file — into a complete, personalised learning system in seconds. Upload your material once; the app:

1. Extracts a structured study plan (Units → Chapters → Topics) with AI
2. Generates flashcards and schedules reviews using the SM-2 algorithm
3. Answers your questions using Retrieval-Augmented Generation over your document
4. Generates practice exams and grades your short answers with AI
5. Tracks your memory retention mathematically using the Ebbinghaus forgetting curve
6. Predicts how ready you are for your exam based on mastery data

The project sits at the intersection of natural language processing, cognitive science, and educational technology.

---

## Features

### AI-Powered Learning

| Feature | How it works |
|---|---|
| **Study Plan Extraction** | Gemini 2.5 Flash reads the uploaded document and returns a typed JSON hierarchy (Book → Unit → Chapter → Topic) including difficulty, estimated study time, revision schedule, and daily exercises — enforced via a structured response schema |
| **RAG Chat (Study Buddy)** | Documents are chunked into 800-character segments with 150-character overlap, embedded with `text-embedding-004`, and stored. Each user query is embedded and matched against stored chunks via cosine similarity. Only the top-5 semantically relevant chunks are injected into the prompt, reducing hallucination and improving precision |
| **Socratic Mode** | A system-prompt toggle converts the chat model from a direct-answer assistant into a Socratic guide that responds only with leading questions, promoting active recall over passive reading |
| **AI Flashcards + SM-2** | Gemini generates 5 flashcards per topic in structured JSON. Each card is tracked with the SuperMemo SM-2 algorithm: reviews update the ease factor (EF), interval, and repetition count according to the original Wozniak (1987) formula |
| **Practice Exam + AI Grader** | Gemini generates a 5-question exam per topic (4 MCQ + 1 short answer) using a JSON response schema. MCQ is graded instantly. Short answers are evaluated by a dedicated AI grader prompt that returns a score (0, 0.5, or 1) plus two-sentence feedback |
| **AI Study Notes** | On demand, Gemini produces structured study notes per topic: a concise summary, key-concept definitions (term + definition pairs), worked examples, common mistakes, and a memory tip — all returned as validated JSON |
| **Document Summarisation** | Single-click summary of any uploaded file; results are cached server-side |

### Cognitive Science & Analytics

| Feature | Science behind it |
|---|---|
| **Topic Mastery Scoring** | Cumulative SM-2 review outcomes (correct / total) mapped to a 0–100% score, displayed as colour-coded badges on every topic card |
| **Exam Readiness Predictor** | Set an exam date → readiness % = (0.6 × completion%) + (0.4 × avg mastery%). Shows days remaining, weakest topics by mastery score |
| **Forgetting Curve** | Estimated retention per topic using R = e^(−t/S), where t = days since last SM-2 review, S = current interval (stability proxy). Topics sorted by lowest retention first |
| **Knowledge Map** | Collapsible tree visualisation of the full plan hierarchy; dots colour-coded green / yellow / red by mastery, or grey for unstarted |
| **Study Activity Heatmap** | 63-day GitHub-style contribution grid; cell opacity = study minutes / daily maximum |

### Study Tools

- **Pomodoro focus timer** with deep-focus mode (animated liquid fill, ambient pulse)
- **Weekly Goal Tracker** — SVG circular progress ring against a user-set minute target
- **Drill Mode** — detects the topic with the most overdue SM-2 cards and launches a flashcard session automatically
- **Due card badges** — orange "X due" indicator on any topic where SM-2 review is scheduled for today or earlier
- **Scheduled sessions** — add study slots manually or via AI suggestion; Google Calendar export links generated automatically
- **Study streak counter** with badge awards
- **Dark / deep-focus theme**

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT (React 19)                          │
│                                                                     │
│  Dashboard ── Flashcards ── StudyBuddy ── Analytics ── Settings    │
│      │              │            │             │                    │
│   SM-2 UI    Practice Exam    RAG Chat   Forgetting Curve           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS / JSON
┌──────────────────────────▼──────────────────────────────────────────┐
│                       EXPRESS SERVER (Node.js)                      │
│                                                                     │
│  /api/upload          store file → async background RAG indexing    │
│  /api/extract-plan    Gemini structured plan extraction             │
│  /api/chat            embed query → cosine search → RAG response    │
│  /api/flashcards      Gemini JSON flashcard generation              │
│  /api/practice-exam   Gemini 5-Q exam with JSON schema              │
│  /api/grade-answer    Gemini short-answer grader (0 / 0.5 / 1)     │
│  /api/study-notes     Gemini structured notes (NLG)                 │
│  /api/summarize       Gemini document summary                       │
│  /api/rag-status/:id  embedding readiness polling                   │
│  /api/health          diagnostic endpoint                           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Google GenAI SDK
              ┌────────────▼──────────────┐
              │   Gemini 2.5 Flash (LLM)  │
              │   text-embedding-004      │
              └───────────────────────────┘
```

For a deep technical breakdown of each AI component, see **[ARCHITECTURE.md](./ARCHITECTURE.md)**.

---

## Tech Stack

### Frontend
| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 4 |
| Animation | Motion (Framer Motion) |
| Routing | React Router 7 |
| Icons | Lucide React |

### Backend
| | |
|---|---|
| Server | Node.js + Express 4 |
| Runtime | `tsx` (TypeScript, no compilation step) |
| AI SDK | `@google/genai` v1.46 |
| LLM | Gemini 2.5 Flash |
| Embeddings | `text-embedding-004` (768-dim) |

### Infrastructure & Storage
| | |
|---|---|
| Auth | Firebase Authentication (Google SSO, Phone OTP) |
| Cloud DB | Firestore (user profiles, cross-device sync) |
| Local storage | Capacitor Preferences (offline-first, all study data) |
| Deployment | Render.com — Oregon region (required for Gemini API) |
| Mobile | Capacitor (Android) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Gemini API key — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Firebase project with **Authentication** and **Firestore** enabled

### 1. Clone and install

```bash
git clone https://github.com/ethanhunt1011/studyindex.git
cd studyindex
npm install
```

### 2. Environment variables

Create a `.env` file in the root:

```env
VITE_GEMINI_API_KEY=your_gemini_key_here

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_FIRESTORE_ID=...
```

### 3. Run locally

```bash
npm run dev      # Vite + Express on http://localhost:3000
```

### 4. Build for production

```bash
npm run build    # outputs to /dist
npm start        # serves /dist via Express
```

### 5. Deploy to Render

The `render.yaml` in the root defines a complete Render service. Connect your GitHub repo, add the environment variables above, and deploy. **You must use the Oregon region** — the Gemini API is not available in all Render regions.

---

## Project Structure

```
studyindex/
├── server.ts                      # Express API server + RAG engine
├── render.yaml                    # Render.com deployment config
├── ARCHITECTURE.md                # Deep-dive technical documentation
├── src/
│   ├── App.tsx                    # Root component, global state, auth
│   ├── components/
│   │   ├── DashboardContent.tsx   # Dashboard, modals (flashcard, exam, notes)
│   │   └── Layout.tsx             # Navigation shell
│   ├── pages/
│   │   ├── index.tsx              # Analytics, StudyBuddy, Settings, Rooms
│   │   ├── Dashboard.tsx          # Dashboard route wrapper
│   │   └── Login.tsx              # Auth screen
│   ├── lib/
│   │   ├── storage.ts             # SM-2, mastery, exam, goal storage layer
│   │   ├── firebase.ts            # Firebase init + auth helpers
│   │   └── utils.ts               # cn() and utility functions
│   └── services/
│       └── gemini.ts              # Shared type definitions
└── capacitor.config.ts
```

---

## Security

- The Gemini API key is **never exposed to the browser** — all AI calls are proxied through the Express server
- An in-memory rate limiter enforces 50 requests per minute per IP address
- Firebase credentials are loaded from environment variables at build time via Vite's `define` block
- File uploads are validated server-side; the 50 MB body-parser limit prevents abuse

---

## AI Techniques Summary

| Technique | Field |
|---|---|
| Gemini 2.5 Flash | Generative AI / LLM |
| RAG with text-embedding-004 | NLP / Vector Search |
| Cosine similarity retrieval | Information Retrieval |
| SM-2 spaced repetition | Cognitive Science |
| Topic mastery scoring | Knowledge Tracing |
| AI practice exam generation | NLG / Assessment |
| Short-answer AI grading | LLM Evaluation |
| Socratic mode | Prompt Engineering |
| AI study notes | Natural Language Generation |
| Ebbinghaus forgetting curve | Cognitive Modelling |

---

## Licence

MIT
