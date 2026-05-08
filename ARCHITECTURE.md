# StudyIndex — Technical Architecture

A deep-dive into every AI and cognitive-science component in the codebase. Written for developers and reviewers who want to understand *why* each design decision was made, not just *what* it does.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [RAG Pipeline — Retrieval-Augmented Generation](#2-rag-pipeline)
3. [Study Plan Extraction — Structured LLM Output](#3-study-plan-extraction)
4. [SM-2 Spaced Repetition Algorithm](#4-sm-2-spaced-repetition)
5. [Ebbinghaus Forgetting Curve Modelling](#5-ebbinghaus-forgetting-curve)
6. [AI Flashcard Generation + SM-2 Integration](#6-ai-flashcard-generation)
7. [Practice Exam Generation + AI Grader](#7-practice-exam--ai-grader)
8. [Socratic Mode — Prompt Engineering](#8-socratic-mode)
9. [AI Study Notes — Natural Language Generation](#9-ai-study-notes-nlg)
10. [Topic Mastery Scoring](#10-topic-mastery-scoring)
11. [Exam Readiness Predictor](#11-exam-readiness-predictor)
12. [System Design Decisions](#12-system-design-decisions)

---

## 1. System Overview

```
Browser (React 19 + TypeScript)
       │
       │  HTTPS / JSON  (all AI calls proxied — API key never exposed)
       ▼
Express Server (Node.js / tsx)
       │
       │  Google GenAI SDK  v1.46
       ▼
┌──────────────────────────────┐
│  Gemini 2.5 Flash  (LLM)     │  — structured plan extraction, flashcards,
│  text-embedding-004 (768-d)  │    practice exams, grading, notes, chat
└──────────────────────────────┘
```

**Key constraint:** the Gemini API key lives only in server-side environment variables. Every AI feature is a server-proxied call — the browser never sees the key. An in-memory rate limiter (50 req / min / IP) protects the key from abuse.

---

## 2. RAG Pipeline

> **File:** `server.ts` — `chunkText`, `generateEmbedding`, `retrieveRelevantChunks`, `/api/upload`, `/api/chat`

### Why RAG?

Feeding an entire document into every chat request is expensive, slow, and wastes the context window on irrelevant text. RAG solves this by finding *only* the passages semantically related to the current question before constructing the prompt.

### Step 1 — Chunking

```typescript
function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 40) chunks.push(chunk);   // drop micro-fragments
    if (end === text.length) break;
    start += chunkSize - overlap;                 // 150-char sliding overlap
  }
  return chunks;
}
```

**Parameters:**
| Parameter | Value | Rationale |
|---|---|---|
| `chunkSize` | 800 chars | Fits comfortably within `text-embedding-004`'s 2048-token limit while preserving meaningful semantic units |
| `overlap` | 150 chars | Prevents concepts that straddle chunk boundaries from being lost. A sentence that starts at char 790 still appears fully in the next chunk |
| Min chunk length | 40 chars | Discards whitespace-only slices and single-line fragments that carry no semantic content |

### Step 2 — Embedding

Each chunk is converted into a 768-dimensional float vector by `text-embedding-004`:

```typescript
async function generateEmbedding(text: string, ai: GoogleGenAI): Promise<number[]> {
  const result = await (ai.models as any).embedContent({
    model: 'text-embedding-004',
    content: text,
  });
  return result?.embedding?.values ?? [];
}
```

Embeddings are computed asynchronously in a background `setImmediate` task immediately after upload — the user receives their `fileId` instantly and the RAG index builds without blocking the response. An 80 ms delay between requests respects Gemini API rate limits without saturating the connection.

The embedding store is a simple in-memory `Map<fileId, ChunkData>`:

```typescript
interface ChunkData {
  chunks: string[];
  embeddings: number[][];
  embeddedAt: number;
  model: string;        // 'text-embedding-004' — recorded for reproducibility
}
```

### Step 3 — Retrieval (cosine similarity)

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);  // ε avoids /0
}
```

At query time:
1. The user's question is embedded with the same `text-embedding-004` model (critical — query and document must share the same embedding space).
2. Cosine similarity is computed between the query vector and every stored chunk vector.
3. Top-5 chunks with `score > 0.25` are selected. The 0.25 threshold filters out weakly-related noise.
4. The selected chunks are injected into the prompt with their relevance scores, labelled as `[Chunk N | relevance: 0.xx]`.

```typescript
function retrieveRelevantChunks(queryEmbedding, fileId, topK = 5) {
  return data.chunks
    .map((chunk, i) => ({ chunk, score: cosineSimilarity(queryEmbedding, data.embeddings[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(r => r.score > 0.25);
}
```

### Fallback Behaviour

If the document is a PDF or image (not embeddable as plain text), or if the RAG index is still building, the full document content is passed as an inline data part — Gemini's multi-modal capability handles it natively.

### RAG Status Polling

The frontend polls `/api/rag-status/:fileId` to show a progress indicator:

```json
{
  "ready": true,
  "chunkCount": 42,
  "embeddedChunks": 42,
  "model": "text-embedding-004",
  "embeddedAt": 1716300000000
}
```

---

## 3. Study Plan Extraction

> **File:** `server.ts` — `/api/extract-plan`

### Structured Output via JSON Schema

Rather than asking Gemini to return free-form text and parsing it with regex, the API enforces a typed response schema using `responseMimeType: "application/json"` and a full `responseSchema` object:

```
Book
 └── Unit[]
      └── Chapter[]
           └── Topic[]
                ├── id            (string — used as a stable key throughout the app)
                ├── title
                ├── difficulty    (Easy | Medium | Complex)
                ├── importance    (High | Medium | Low)
                ├── dailyExercise (specific practice task)
                ├── motivation    (motivational sentence)
                ├── order         (study sequence number)
                ├── estimatedTime (e.g. "30 mins")
                └── revisionSchedule (e.g. "Revise in 3 days")
```

The schema is passed to the Gemini API using `@google/genai`'s `Type` enum, which generates a validated JSON response — **no parsing heuristics, no regex, no hallucinated field names**. If Gemini's output doesn't match the schema, the SDK raises an error before the response reaches application code.

### Why this matters

Downstream features — SM-2 card IDs, mastery tracking, the Knowledge Map, Drill Mode, Forgetting Curve — all key their data to `topic.id`. The deterministic schema ensures those IDs are always present and always strings.

---

## 4. SM-2 Spaced Repetition

> **File:** `src/lib/storage.ts` — `sm2Update`, `sm2NewCard`

### Background

SuperMemo 2 (SM-2) was published by Piotr Wozniak in 1987 and is the algorithm underlying Anki, the most widely used flashcard software in the world. It models memory consolidation: each successful recall strengthens the memory trace, allowing reviews to be spaced further apart over time.

### State per card

```typescript
interface SM2Card {
  easeFactor:   number;  // starts 2.5; range [1.3, ∞)
  interval:     number;  // days until next review
  repetitions:  number;  // consecutive successful reviews
  dueDate:      string;  // ISO date — when this card should next be reviewed
  lastReviewed: string | null;
}
```

### The algorithm

```typescript
function sm2Update(card: SM2Card, grade: number): SM2Card {
  // grade: 0 = complete blackout, 3 = recalled with difficulty, 5 = perfect recall

  if (grade >= 3) {
    // Correct recall — increase interval
    if (repetitions === 0)      interval = 1;
    else if (repetitions === 1) interval = 6;
    else                        interval = Math.round(interval * easeFactor);
    repetitions += 1;
  } else {
    // Incorrect — reset to day 1 (re-learn from scratch)
    repetitions = 0;
    interval = 1;
  }

  // Ease factor update (Wozniak 1987 formula)
  easeFactor = Math.max(1.3,
    easeFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)
  );
```

**Key properties of the EF update formula:**
- A grade of 5 (perfect) adds +0.1 to EF → intervals grow faster over time
- A grade of 3 (recalled with difficulty) is neutral → intervals hold steady
- A grade of 0 (total failure) subtracts 0.3 from EF → intervals shrink
- The floor of 1.3 prevents intervals from growing so slowly the algorithm stalls

**Practical effect:** A topic reviewed perfectly 5 times will be scheduled roughly 60–90 days out. A topic consistently recalled with difficulty stays at short intervals until confidence improves.

### Integration with the UI

- Each topic displays an orange badge showing the count of cards due today or overdue
- **Drill Mode** scans all SM-2 cards, finds the topic with the highest count of overdue cards, and launches its flashcard session automatically
- The mastery score (§10) is derived from SM-2 review outcomes, creating a feedback loop between the cognitive algorithm and the visual progress system

---

## 5. Ebbinghaus Forgetting Curve

> **File:** `src/pages/index.tsx` — Forgetting Curve section

### The science

Hermann Ebbinghaus (1885) empirically derived that memory retention decays exponentially:

```
R(t) = e^(−t / S)
```

Where:
- `R` = retention (0–1, probability of recall)
- `t` = time elapsed since last review (days)
- `S` = memory *stability* (larger S → slower decay)

### Stability proxy

True stability requires tracking every review with full SRS history. As a practical proxy, the SM-2 `interval` field is used: a card scheduled for review in 30 days has demonstrated 30 days of effective retention, so `S = interval`. This gives a principled approximation without requiring separate stability tracking infrastructure.

### Per-topic retention

```typescript
// For each topic, average the retention of all its SM-2 cards
const retention = Math.exp(-daysSince / card.interval);
```

Where `daysSince = today − lastReviewed` in integer days.

Topics are sorted by lowest average retention first, so the most-forgotten material always appears at the top of the Forgetting Curve panel — giving the student an evidence-based "study this next" signal.

### Why this is meaningful

Standard study apps show "completed" or "not completed." StudyIndex models *memory decay* — a topic you mastered two weeks ago and haven't touched since will show declining retention, prompting a timely review. This is the correct cognitive framing: completion is a point-in-time event; retention is a continuous function of time.

---

## 6. AI Flashcard Generation

> **File:** `server.ts` — `/api/flashcards`

Flashcards are generated on demand per topic using a strict JSON array schema:

```typescript
responseSchema: {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      answer:   { type: Type.STRING }
    },
    required: ["question", "answer"]
  }
}
```

Results are cached server-side with the key `fc:<topicTitle>` — the same topic always returns identical cards within a server session, preventing SM-2 card IDs from drifting.

When the user reviews a flashcard, they self-assess on a 0–5 scale, which is fed directly into `sm2Update()`. The new `dueDate`, `interval`, and `easeFactor` are persisted via Capacitor Preferences. This closes the loop between AI generation and algorithmic scheduling.

---

## 7. Practice Exam + AI Grader

> **File:** `server.ts` — `/api/practice-exam`, `/api/grade-answer`

### Exam generation

Each practice exam contains 5 questions generated with a typed schema:

```
4 × Multiple Choice  (type: "mcq")
    ├── question
    ├── options: string[4]          — exactly 4 choices
    ├── correctAnswer               — exact match to one of `options`
    └── explanation                 — shown after the student answers

1 × Short Answer     (type: "short-answer")
    ├── question
    └── correctAnswer               — model answer for the AI grader
```

The prompt instructs Gemini to make questions "progressively harder" — the 4th MCQ tests synthesis, not recall.

### AI Grader

Short answers cannot be graded with string comparison. A dedicated grading prompt evaluates the student's response against the model answer:

```
Score 1   = correct (fully addresses the question)
Score 0.5 = partial (correct direction but incomplete or imprecise)
Score 0   = incorrect
```

The grader prompt is deliberately terse and rubric-focused:

```
"Grade fairly. Partial credit (score 0.5) is allowed for partially correct answers.
Provide brief, encouraging feedback (2 sentences max)."
```

The 2-sentence limit is intentional: verbose grader feedback creates cognitive overload. Students read a short verdict and move on.

### Score aggregation

Final score = Σ(question scores) / totalQuestions × 100. MCQ scores are binary (1 or 0); the short answer contributes 0, 0.5, or 1. Results are persisted to `practice_history` via Capacitor Preferences and shown in the Practice Exam History panel on the Analytics page.

---

## 8. Socratic Mode

> **File:** `server.ts` — `/api/chat` (system instruction), `src/pages/index.tsx` — Brain toggle

Socratic mode is implemented as a **system-prompt swap** — the same endpoint, the same model, but a different instruction frame:

```typescript
systemInstruction: socraticMode
  ? "You are a Socratic AI tutor. NEVER give direct answers or solutions. Instead, guide the student to discover the answer themselves through leading questions. Ask things like 'What do you think happens when...?', 'Can you connect this to...?', 'What would occur if...?'. Be patient and encouraging. If the student is completely stuck, give a small hint only."
  : "You are a helpful study buddy. Answer questions based on the provided context if available, otherwise answer generally. Be concise and educational."
```

### Why prompt engineering is genuinely hard here

A naive instruction like "don't give answers" fails because Gemini will add "but the answer is..." after the question. The prompt is carefully constructed to:
1. Explicitly state the *identity* ("You are a Socratic tutor") — models perform better with a persona than with a prohibition
2. Provide concrete example phrasings to constrain the output style
3. Include a safety valve ("give a small hint only") to prevent the model from leaving the student completely stranded

The toggle state is held in React component state and sent as `socraticMode: boolean` in the fetch body — no separate endpoint needed.

---

## 9. AI Study Notes (NLG)

> **File:** `server.ts` — `/api/study-notes`

Study notes are generated as structured JSON with six distinct fields, each serving a different pedagogical purpose:

| Field | Cognitive function |
|---|---|
| `summary` | Executive overview — activates prior knowledge before detail learning |
| `keyConcepts` | Term/definition pairs — explicit vocabulary building |
| `keyPoints` | Bulleted facts — retrieval-practice targets |
| `examples` | Concrete instantiations — supports transfer learning |
| `commonMistakes` | Error analysis — reduces misconception formation |
| `memoryTip` | Mnemonic / encoding strategy — hooks new material to existing memory |

This structure maps directly onto known principles from cognitive load theory (Sweller, 1988) and the testing effect (Roediger & Karpicke, 2006). Rather than generating a wall of prose, the AI is constrained to produce content in these six cognitively-motivated buckets.

Notes are cached server-side (`notes:<topicTitle>`) so the same topic always returns the same notes within a session — important for consistency when a student revisits notes multiple times.

---

## 10. Topic Mastery Scoring

> **File:** `src/lib/storage.ts` — `TopicMastery`; `src/components/DashboardContent.tsx`

Mastery is tracked per topic as a running score:

```typescript
interface TopicMastery {
  topicId:        string;
  score:          number;   // 0–100
  totalReviews:   number;
  correctReviews: number;
  lastUpdated:    string;
}

score = (correctReviews / totalReviews) × 100
```

Every SM-2 review updates both the card state and the mastery record for its parent topic. The score drives three visual systems:

1. **Dashboard badges** — colour-coded labels (green ≥70, amber 40–69, red <40, grey = unstarted)
2. **Knowledge Map** — tree dots coloured by mastery (green / yellow / red / grey)
3. **Exam Readiness** — average mastery across all topics feeds the readiness formula (§11)

---

## 11. Exam Readiness Predictor

> **File:** `src/pages/index.tsx` — Exam Readiness section

```
readiness% = (0.6 × completion%) + (0.4 × avgMastery%)
```

**Completion%** = topics marked done / total topics — measures *breadth* of coverage.
**avgMastery%** = mean mastery score across all reviewed topics — measures *depth* of understanding.

The 60/40 weighting reflects the pragmatic reality of exam preparation: reaching all topics matters more than perfecting a subset, but mastery cannot be ignored. Both weights are surfaced in the UI so students can see the formula driving their readiness score.

Additional outputs:
- Days remaining until exam date (from `examDate` stored in `ExamSettings`)
- Weakest topics sorted by ascending mastery score — actionable study targets, not just a number

---

## 12. System Design Decisions

### Why an Express proxy instead of direct client-side API calls?

Exposing an API key in a React bundle means it is trivially extractable from `dist/`. Any user who opens DevTools → Sources → `main.js` and searches for `AIza` will find it. Proxying through Express means the key lives only in server-side environment variables.

The trade-off is latency: client → server → Gemini → server → client adds one network hop. For this use case (study tools, not real-time games), the latency is imperceptible to the user.

### Why Capacitor Preferences for study data (not Firestore)?

Firestore is used only for authentication and cross-device profile sync. All study data (plans, SM-2 cards, mastery scores, sessions, goals) lives in `@capacitor/preferences` — which maps to `localStorage` on web and `SharedPreferences` / `NSUserDefaults` on Android/iOS.

**Rationale:**
1. **Offline-first** — students study on aeroplanes, in libraries, in underground stations. Firestore requires a network; Preferences does not.
2. **Zero cost** — Firestore read/write costs accumulate at scale. Study data can involve hundreds of writes per session.
3. **Latency** — synchronous local reads vs. async Firestore reads. The SM-2 card count badges on every topic card would require 50+ Firestore reads per page load.

### Why Oregon (us-west-2) on Render?

The Gemini API (`generativelanguage.googleapis.com`) requires traffic to originate from Google-supported regions. Render's Ohio (us-east-1) region routes traffic in ways that occasionally hit Google's geographic restrictions. Oregon (us-west-2) routes cleanly. This is documented in Render's knowledge base and confirmed empirically during development.

### Why `tsx` as the server runtime?

`tsx` executes TypeScript files directly without a compilation step, using `esbuild` under the hood. The server never needs to be built separately — `npm run dev` starts both Vite and `tsx server.ts` concurrently. For production, the same `tsx server.ts` command works because `tsx` is included as a dependency (not a dev dependency).

The alternative — compiling `server.ts` to `server.js` with `tsc` — requires managing `outDir`, `moduleResolution`, and path aliases across two config files. For a single-file server, this overhead has no benefit.

### Caching strategy

The in-memory `chatCache` Map provides per-session memoization for deterministic responses:

| Cache key | What it stores |
|---|---|
| `fc:<topicTitle>` | Flashcard array JSON |
| `notes:<topicTitle>` | Study notes JSON |
| `sum:<fileId>` | Document summary text |
| `chat:<fileId>:<query>` | Non-RAG chat responses only |

RAG responses are intentionally **not cached** because each response is tailored to a specific query's retrieved chunks. Caching them would serve stale context if the document changes.

Practice exams are also not cached — re-generating them produces question variety, which is desirable for spaced practice.

---

*For feature-level documentation, see [README.md](./README.md).*
