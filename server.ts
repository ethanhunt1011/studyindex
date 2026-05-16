import 'dotenv/config';   // load .env in local dev (no-op when env vars already set)
import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import { YoutubeTranscript } from "youtube-transcript";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// JSON body limit — file uploads now go through multipart/form-data (multer), not JSON
app.use(express.json({ limit: '10mb' }));

// ─── Multer: multipart upload (up to 150 MB) ──────────────────────────────────
const INLINE_THRESHOLD = 15 * 1024 * 1024; // files ≤ 15 MB → Gemini inlineData
                                             // files  > 15 MB → Gemini File API

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'text/plain', 'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Rate limiter ──────────────────────────────────────────────────────────────
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const LIMIT = 50;
const WINDOW = 60 * 1000;

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const userLimit = rateLimit.get(ip) || { count: 0, resetTime: now + WINDOW };
  if (now > userLimit.resetTime) { userLimit.count = 0; userLimit.resetTime = now + WINDOW; }
  if (userLimit.count >= LIMIT) return res.status(429).json({ error: "Too many requests. Please try again later." });
  userLimit.count++;
  rateLimit.set(ip, userLimit);
  next();
};

// ─── In-memory stores ──────────────────────────────────────────────────────────
const fileContents = new Map<string, string>();
const chatCache = new Map<string, string>();

// RAG: per-document chunks + embeddings
interface ChunkData {
  chunks: string[];
  embeddings: number[][];
  embeddedAt: number;
  model: string;
}
const documentChunks = new Map<string, ChunkData>();

// ─── API key ───────────────────────────────────────────────────────────────────
const getApiKey = () => {
  const rawKey = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  return rawKey?.replace(/['"]/g, '').trim();
};

// ─── Health / diagnostic endpoint ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  const apiKey = getApiKey();
  res.json({
    status: 'ok',
    geminiKey: apiKey ? `configured (${apiKey.length} chars)` : 'MISSING — set VITE_GEMINI_API_KEY on Render',
    nodeEnv: process.env.NODE_ENV || 'not set',
    ragDocuments: documentChunks.size,
  });
});

// ─── RAG: chunking, embedding, retrieval ──────────────────────────────────────

/**
 * Split text into overlapping chunks for embedding.
 * Overlap ensures context continuity across chunk boundaries.
 */
function chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 40) chunks.push(chunk);
    if (end === text.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

/**
 * Cosine similarity between two embedding vectors.
 * Returns a value in [-1, 1]; higher = more semantically similar.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

/** Generate a single embedding vector via Gemini text-embedding-004 */
async function generateEmbedding(text: string, ai: GoogleGenAI): Promise<number[]> {
  try {
    const result = await (ai.models as any).embedContent({
      model: 'text-embedding-004',
      content: text,
    });
    return result?.embedding?.values ?? [];
  } catch (err) {
    console.error('Embedding error:', err);
    return [];
  }
}

/**
 * Retrieve top-k most semantically relevant chunks for a query.
 * Uses cosine similarity against pre-computed chunk embeddings.
 */
function retrieveRelevantChunks(
  queryEmbedding: number[],
  fileId: string,
  topK = 5
): { chunk: string; score: number }[] {
  const data = documentChunks.get(fileId);
  if (!data || !data.chunks.length) return [];
  return data.chunks
    .map((chunk, i) => ({ chunk, score: cosineSimilarity(queryEmbedding, data.embeddings[i] || []) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(r => r.score > 0.25);
}

// ─── File content helpers ──────────────────────────────────────────────────────

interface StoredFile {
  content?: string;   // base64 DataURI — set for inline (≤ 15 MB) files
  fileUri?: string;   // Gemini File API URI — set for large (> 15 MB) files
  mimeType: string;
}

/** Build Gemini content parts from a stored file record */
function fileToContentParts(stored: StoredFile): any[] {
  if (stored.fileUri) {
    return [{ fileData: { fileUri: stored.fileUri, mimeType: stored.mimeType } }];
  }
  const { content = '', mimeType } = stored;
  if (mimeType?.startsWith('image/') || mimeType === 'application/pdf') {
    const base64Data = content.includes(',') ? content.split(',')[1] : content;
    return [{ inlineData: { data: base64Data, mimeType } }];
  }
  let textContent = content;
  if (content.includes(',')) {
    try { textContent = Buffer.from(content.split(',')[1], 'base64').toString('utf-8'); }
    catch { /* keep raw */ }
  }
  return [{ text: textContent }];
}

/** Decode an inline base64 data-URI to plain text (for RAG chunking) */
function decodeToText(stored: StoredFile): string {
  if (stored.fileUri) return ''; // large files handled natively by Gemini — no local RAG
  const content = stored.content || '';
  if (!content.includes(',')) return content;
  try { return Buffer.from(content.split(',')[1], 'base64').toString('utf-8'); }
  catch { return content; }
}

// ─── /api/upload ──────────────────────────────────────────────────────────────
app.post("/api/upload", upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file received. Send a multipart/form-data request with field name "file".' });

  const mimeType = file.mimetype;
  const fileId = Date.now().toString();
  console.log(`Upload received: ${file.originalname} | ${mimeType} | ${(file.size / 1024 / 1024).toFixed(1)} MB`);

  try {
    if (file.size > INLINE_THRESHOLD) {
      // ── Large file: upload to Gemini File API ──────────────────────────────
      console.log(`Large file — uploading to Gemini File API...`);
      const apiKey = getApiKey();
      if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
      const ai = new GoogleGenAI({ apiKey });

      const blob = new Blob([file.buffer], { type: mimeType });
      let geminiFile = await ai.files.upload({ file: blob, config: { mimeType, displayName: file.originalname || 'upload' } });

      // Poll until Gemini finishes processing (usually seconds for PDFs)
      const deadline = Date.now() + 120_000;
      while (geminiFile.state === 'PROCESSING') {
        if (Date.now() > deadline) return res.status(504).json({ error: 'Gemini file processing timed out. Try a smaller file.' });
        await new Promise(r => setTimeout(r, 2000));
        geminiFile = await ai.files.get({ name: geminiFile.name! });
      }
      if (geminiFile.state === 'FAILED') return res.status(500).json({ error: 'Gemini could not process this file.' });

      const stored: StoredFile = { fileUri: geminiFile.uri!, mimeType };
      fileContents.set(fileId, JSON.stringify(stored));
      console.log(`Gemini File API ready: ${geminiFile.uri}`);
      return res.json({ fileId });
    }

    // ── Small file: store as base64 inline ────────────────────────────────────
    const dataUri = `data:${mimeType};base64,${file.buffer.toString('base64')}`;
    const stored: StoredFile = { content: dataUri, mimeType };
    fileContents.set(fileId, JSON.stringify(stored));
    res.json({ fileId });

    // Non-blocking RAG pipeline for text documents
    if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') {
      setImmediate(async () => {
        try {
          const apiKey = getApiKey();
          if (!apiKey) return;
          const textContent = decodeToText(stored);
          const chunks = chunkText(textContent);
          if (!chunks.length) return;
          console.log(`RAG: embedding ${chunks.length} chunks for fileId ${fileId}`);
          const ai = new GoogleGenAI({ apiKey });
          const embeddings: number[][] = [];
          for (const chunk of chunks) {
            embeddings.push(await generateEmbedding(chunk, ai));
            await new Promise(r => setTimeout(r, 80));
          }
          documentChunks.set(fileId, { chunks, embeddings, embeddedAt: Date.now(), model: 'text-embedding-004' });
          console.log(`RAG: ready — ${embeddings.filter(e => e.length).length}/${chunks.length} chunks embedded`);
        } catch (err) {
          console.error('RAG background embedding error:', err);
        }
      });
    }
  } catch (err: any) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err?.message || 'Upload failed.' });
  }
});

/** RAG status endpoint — lets the frontend know when embeddings are ready */
app.get("/api/rag-status/:fileId", (req, res) => {
  const data = documentChunks.get(req.params.fileId);
  res.json({
    ready: !!data && data.embeddings.some(e => e.length > 0),
    chunkCount: data?.chunks.length ?? 0,
    embeddedChunks: data?.embeddings.filter(e => e.length > 0).length ?? 0,
    model: data?.model ?? null,
    embeddedAt: data?.embeddedAt ?? null,
  });
});

// ─── /api/summarize ───────────────────────────────────────────────────────────
app.post("/api/summarize", rateLimiter, async (req, res) => {
  const { fileId } = req.body;
  const fileData = fileContents.get(fileId);
  if (!fileData) return res.status(404).json({ error: "File not found" });

  const cacheKey = `sum:${fileId}`;
  if (chatCache.has(cacheKey)) return res.json({ summary: chatCache.get(cacheKey) });

  try {
    const stored: StoredFile = JSON.parse(fileData);
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });

    const ai = new GoogleGenAI({ apiKey });
    const fileParts = fileToContentParts(stored);
    const instruction = stored.mimeType?.startsWith('image/')
      ? "Summarize this image. Use a neat, clean, point-based format with bullet points instead of paragraphs."
      : "Summarize the above content. Use a neat, clean, point-based format with bullet points instead of paragraphs.";
    const contents: any[] = [...fileParts, { text: instruction }];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contents },
    });
    const summary = response.text || "";
    chatCache.set(cacheKey, summary);
    res.json({ summary });
  } catch (error: any) {
    console.error('Error in summarize:', error);
    res.status(500).json({ error: error?.message || 'Error generating summary.' });
  }
});

// ─── /api/schedule ────────────────────────────────────────────────────────────
app.post("/api/schedule", rateLimiter, async (req, res) => {
  const { fileId, deadlines } = req.body;
  const content = fileId ? fileContents.get(fileId) : "";
  if (!content) return res.status(400).json({ error: "No study material provided." });

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on this study material: ${content}\n\nAnd these deadlines: ${deadlines}\n\nGenerate a study schedule. Return as structured JSON with fields: date, topic, durationMinutes.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              topic: { type: Type.STRING },
              durationMinutes: { type: Type.NUMBER }
            },
            required: ["date", "topic", "durationMinutes"]
          }
        }
      }
    });
    res.json(JSON.parse(response.text || "[]"));
  } catch (error: any) {
    console.error('Error in schedule:', error);
    res.status(500).json({ error: error?.message || 'Error generating schedule.' });
  }
});

// ─── /api/extract-plan ────────────────────────────────────────────────────────
app.post("/api/extract-plan", rateLimiter, async (req, res) => {
  const { fileId } = req.body;
  const fileData = fileContents.get(fileId);
  if (!fileData) return res.status(404).json({ error: "File not found" });

  try {
    const stored: StoredFile = JSON.parse(fileData);
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const fileParts = fileToContentParts(stored);
    const contents: any[] = [
      ...fileParts,
      { text: `Extract a complete study plan hierarchy: Units → Chapters → Topics.

CRITICAL RULE: For each Chapter, identify ALL distinct sub-topics, individual concepts, named laws/theorems, processes, and sections within it — these become individual Topic cards. A chapter MUST have AT LEAST 3–6 topics. Topics must be specific, atomic learning units (e.g. "Newton's First Law of Motion", "Mitosis Prophase Stage", "Present Perfect Tense Usage", "Dijkstra's Algorithm") — NEVER use the chapter name itself as a topic. Each topic should be independently studiable in 20–45 minutes.

For each Topic:
1. Determine difficulty (Easy, Medium, Complex).
2. Rate importance (High, Medium, Low).
3. Provide a specific 'daily exercise' — a concrete practice problem, worked example prompt, or deep-dive question directly related to that sub-topic.
4. Provide a highly motivational sentence specific to this concept.
5. Determine the optimal study sequence (order) within the chapter.
6. Estimate time to study (e.g., "25 mins", "35 mins").
7. Suggest a revision schedule (e.g., "Revise in 1 day", "Revise in 3 days").
Return as structured JSON.` }
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bookTitle: { type: Type.STRING },
            units: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  chapters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        topics: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              title: { type: Type.STRING },
                              difficulty: { type: Type.STRING },
                              importance: { type: Type.STRING },
                              dailyExercise: { type: Type.STRING },
                              motivation: { type: Type.STRING },
                              order: { type: Type.NUMBER },
                              estimatedTime: { type: Type.STRING },
                              revisionSchedule: { type: Type.STRING }
                            },
                            required: ["id", "title", "difficulty", "importance", "dailyExercise", "motivation", "order", "estimatedTime", "revisionSchedule"]
                          }
                        }
                      },
                      required: ["title", "topics"]
                    }
                  }
                },
                required: ["title", "chapters"]
              }
            }
          },
          required: ["bookTitle", "units"]
        }
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error('Error in extract-plan:', error);
    res.status(500).json({ error: error?.message || 'Error extracting study plan.' });
  }
});

// ─── /api/flashcards ─────────────────────────────────────────────────────────
app.post("/api/flashcards", rateLimiter, async (req, res) => {
  const { topicTitle, context } = req.body;
  if (!topicTitle) return res.status(400).json({ error: "topicTitle is required" });

  const cacheKey = `fc:${topicTitle}`;
  if (chatCache.has(cacheKey)) return res.json(JSON.parse(chatCache.get(cacheKey)!));

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const prompt = context
      ? `Generate 5 concise flashcards for the topic "${topicTitle}". Extra context: ${context}.`
      : `Generate 5 concise flashcards for the topic "${topicTitle}".`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
      }
    });
    const text = response.text || "[]";
    chatCache.set(cacheKey, text);
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error in /api/flashcards:', error);
    res.status(500).json({ error: error?.message || 'Error generating flashcards.' });
  }
});

// ─── /api/chat (RAG-enhanced) ─────────────────────────────────────────────────
app.post("/api/chat", rateLimiter, async (req, res) => {
  const { input, fileId, socraticMode } = req.body;
  const fileData = fileId ? fileContents.get(fileId) : null;
  const apiKey = getApiKey();
  if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];
    let retrievedChunks = 0;
    let ragEnabled = false;

    if (fileData) {
      const stored: StoredFile = JSON.parse(fileData);
      const ragData = fileId ? documentChunks.get(fileId) : null;

      if (!stored.fileUri && ragData && ragData.embeddings.some(e => e.length > 0)) {
        // ── RAG: embed query → cosine similarity → retrieve top-k chunks ──
        const queryEmbedding = await generateEmbedding(input, ai);
        const relevant = retrieveRelevantChunks(queryEmbedding, fileId!, 5);

        if (relevant.length > 0) {
          const context = relevant.map((r, i) => `[Chunk ${i + 1} | relevance: ${r.score.toFixed(2)}]\n${r.chunk}`).join('\n\n---\n\n');
          contents.push({ text: `Context retrieved via semantic search (RAG):\n\n${context}\n\n` });
          retrievedChunks = relevant.length;
          ragEnabled = true;
          console.log(`RAG: retrieved ${relevant.length} chunks (top score: ${relevant[0]?.score.toFixed(3)})`);
        } else {
          contents.push(...fileToContentParts(stored));
        }
      } else {
        // Large file (File API) or no embeddings yet — pass file directly to Gemini
        contents.push(...fileToContentParts(stored));
      }
    }

    contents.push({ text: `Question: ${input}` });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: contents },
      config: {
        systemInstruction: socraticMode
          ? "You are a Socratic AI tutor. NEVER give direct answers or solutions. Instead, guide the student to discover the answer themselves through leading questions. Ask things like 'What do you think happens when...?', 'Can you connect this to...?', 'What would occur if...?'. Be patient and encouraging. If the student is completely stuck, give a small hint only."
          : "You are a helpful study buddy. Answer questions based on the provided context if available, otherwise answer generally. Be concise and educational."
      }
    });
    const text = response.text || "";
    // Only cache non-RAG responses (RAG responses depend on query-specific retrieval)
    if (!ragEnabled) chatCache.set(`chat:${fileId || 'no-file'}:${input}`, text);
    res.json({ text, retrievedChunks, ragEnabled });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error?.message || 'Error generating response.' });
  }
});

// ─── /api/study-notes ────────────────────────────────────────────────────────
app.post("/api/study-notes", rateLimiter, async (req, res) => {
  const { topicTitle, context, style = 'teacher' } = req.body;
  if (!topicTitle) return res.status(400).json({ error: "topicTitle is required" });

  const cacheKey = `notes_${style}:${topicTitle}`;
  if (chatCache.has(cacheKey)) return res.json(JSON.parse(chatCache.get(cacheKey)!));

  const classicPrompt = `Generate comprehensive, exam-ready study notes for: "${topicTitle}".${context ? ` Context: ${context}` : ''}

Write like an expert academic preparing precise, structured notes:
- summary: 3-4 sentence overview — what this topic is, why it matters, and the core idea. Formal and precise.
- keyConcepts: 5-8 essential terms with rigorous, exam-ready definitions specific to this topic.
- keyPoints: 6-10 bullet points covering all important facts, rules, properties, formulas, or processes a student MUST know. Be thorough.
- examples: 3-5 concrete worked examples, calculations, or real-world applications. State them clearly and concisely.
- commonMistakes: 3-5 frequent errors students make and the precise reason each is wrong.
- examTips: 3-4 specific strategies for answering exam questions on this topic.
- memoryTip: one clear mnemonic or structured recall method.`;

  const teacherPrompt = `You are an excellent teacher — the kind students remember for life. Explain "${topicTitle}" to a student as if you're sitting across the table from them.${context ? ` Context from their study material: ${context}` : ''}

Do NOT write like a textbook. Write like a person. Use "you" and "let's". Be warm, direct, and occasionally funny.

- summary: Open with something that makes the student actually care — a surprising fact, a real-world consequence, or a "here's why this matters" moment. Then explain in plain English like you're talking to a smart friend. Conversational, 3-4 sentences.
- keyConcepts: Define each term the way a teacher explains at the board — not a dictionary entry. Use "Think of it as..." or "This is basically..." where it helps. Make it click.
- keyPoints: Your core teaching moments. Each point reads like something you'd say out loud in class. Share insights and the reason WHY, not just facts.
- examples: Walk through each example together. "So here's what happens...", "Notice how...", "This is exactly why...". Make the student see it in action.
- commonMistakes: Warn them with empathy — "A lot of students get confused here, and honestly that's because..." Then explain what goes wrong and how to avoid it.
- examTips: Coach them like you've marked a thousand papers. "When you see this type of question, your first move should be..." Specific and tactical.
- memoryTip: One unforgettable analogy, story, or mnemonic. Something so vivid they'll recall it in the exam room. The weirder and more specific, the better.`;

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: style === 'classic' ? classicPrompt : teacherPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary:        { type: Type.STRING },
            keyConcepts:    { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { term: { type: Type.STRING }, definition: { type: Type.STRING } }, required: ["term", "definition"] } },
            keyPoints:      { type: Type.ARRAY, items: { type: Type.STRING } },
            examples:       { type: Type.ARRAY, items: { type: Type.STRING } },
            commonMistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
            examTips:       { type: Type.ARRAY, items: { type: Type.STRING } },
            memoryTip:      { type: Type.STRING },
          },
          required: ["summary", "keyConcepts", "keyPoints", "examples", "commonMistakes", "examTips", "memoryTip"]
        }
      }
    });
    const text = response.text || '{}';
    chatCache.set(cacheKey, text);
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error in /api/study-notes:', error);
    res.status(500).json({ error: error?.message || 'Error generating study notes.' });
  }
});

// ─── /api/practice-exam ──────────────────────────────────────────────────────
app.post("/api/practice-exam", rateLimiter, async (req, res) => {
  const { topicTitle, context, examType = 'mcq' } = req.body;
  if (!topicTitle) return res.status(400).json({ error: "topicTitle is required" });

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });

    let prompt = '';
    if (examType === 'mcq') {
      prompt = `Create a 10-question multiple-choice exam for: "${topicTitle}".${context ? ` Context: ${context}` : ''}
Generate exactly 10 MCQ questions. Each must have exactly 4 options (A/B/C/D). The correctAnswer field must be the FULL TEXT of the correct option matching exactly one item in the options array.
Make questions progressively harder (Q1-3 easy, Q4-7 medium, Q8-10 hard). Be specific, precise, and educational. Set type="mcq" for all.`;
    } else if (examType === 'short') {
      prompt = `Create a 10-question short-answer exam for: "${topicTitle}".${context ? ` Context: ${context}` : ''}
Generate exactly 10 short-answer questions. Each answer should be 1-3 sentences. The correctAnswer field should be a concise model answer (1-3 sentences).
Make questions progressively harder. Test understanding, definitions, and application. Set type="short" for all.`;
    } else {
      prompt = `Create a 10-question long-answer exam for: "${topicTitle}".${context ? ` Context: ${context}` : ''}
Generate exactly 10 long-answer/essay questions. Each question should require a detailed paragraph response (5-10 sentences). The correctAnswer field should be a comprehensive model answer (3-5 sentences key points).
Make questions progressively harder — test analysis, synthesis, and critical evaluation. Set type="long" for all.`;
    }

    const itemSchema: any = {
      type: Type.OBJECT,
      properties: {
        id:            { type: Type.NUMBER },
        type:          { type: Type.STRING },
        question:      { type: Type.STRING },
        options:       { type: Type.ARRAY, items: { type: Type.STRING } },
        correctAnswer: { type: Type.STRING },
        explanation:   { type: Type.STRING },
      },
      required: ["id", "type", "question", "correctAnswer", "explanation"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { questions: { type: Type.ARRAY, items: itemSchema } },
          required: ["questions"]
        }
      }
    });
    res.json(JSON.parse(response.text || '{"questions":[]}'));
  } catch (error: any) {
    console.error('Error in /api/practice-exam:', error);
    res.status(500).json({ error: error?.message || 'Error generating practice exam.' });
  }
});

// ─── /api/grade-answer ───────────────────────────────────────────────────────
app.post("/api/grade-answer", rateLimiter, async (req, res) => {
  const { question, correctAnswer, userAnswer } = req.body;
  if (!question || !userAnswer) return res.status(400).json({ error: "question and userAnswer required" });

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are grading a student's short-answer response.
Question: "${question}"
Model Answer: "${correctAnswer}"
Student's Answer: "${userAnswer}"
Grade fairly. Partial credit (score 0.5) is allowed for partially correct answers. Score 1 = correct, 0.5 = partial, 0 = incorrect.
Provide brief, encouraging feedback (2 sentences max).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score:     { type: Type.NUMBER },
            isCorrect: { type: Type.BOOLEAN },
            feedback:  { type: Type.STRING },
          },
          required: ["score", "isCorrect", "feedback"]
        }
      }
    });
    res.json(JSON.parse(response.text || '{"score":0,"isCorrect":false,"feedback":""}'));
  } catch (error: any) {
    console.error('Error in /api/grade-answer:', error);
    res.status(500).json({ error: error?.message || 'Error grading answer.' });
  }
});

// ─── /api/mind-map ───────────────────────────────────────────────────────────
// Generate a hierarchical concept map for a topic.
// Returns a typed tree the frontend renders as an SVG radial mind map.
app.post("/api/mind-map", rateLimiter, async (req, res) => {
  const { topicTitle, context } = req.body;
  if (!topicTitle) return res.status(400).json({ error: "topicTitle is required" });

  const cacheKey = `mindmap:${topicTitle}`;
  if (chatCache.has(cacheKey)) return res.json(JSON.parse(chatCache.get(cacheKey)!));

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a concept mind map for: "${topicTitle}".${context ? ` Context: ${context}` : ''}
Return a hierarchical tree:
- Root = the main topic
- 4-6 primary branches (core sub-concepts or aspects)
- Each branch has 2-4 leaf nodes (specific details, examples, or related ideas)
Keep node labels short (2-5 words). Make it pedagogically useful — think how an expert would chunk this topic for a student.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            root: { type: Type.STRING },
            branches: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  leaves: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["name", "leaves"],
              },
            },
          },
          required: ["root", "branches"],
        },
      },
    });
    const text = response.text || '{"root":"","branches":[]}';
    chatCache.set(cacheKey, text);
    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error('Error in /api/mind-map:', error);
    res.status(500).json({ error: error?.message || 'Error generating mind map.' });
  }
});

// ─── /api/related-topics ─────────────────────────────────────────────────────
// Given a topic and the user's plan topic list, find which other topics are
// semantically related — used to render "Related concepts" links in study notes.
app.post("/api/related-topics", rateLimiter, async (req, res) => {
  const { topicTitle, allTopics } = req.body as { topicTitle: string; allTopics: { id: string; title: string }[] };
  if (!topicTitle || !Array.isArray(allTopics) || allTopics.length === 0) {
    return res.json({ related: [] });
  }

  const cacheKey = `related:${topicTitle}:${allTopics.length}`;
  if (chatCache.has(cacheKey)) return res.json(JSON.parse(chatCache.get(cacheKey)!));

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });

    // Embed the source topic title and every candidate, then rank by cosine similarity.
    const sourceEmbed = await generateEmbedding(topicTitle, ai);
    if (!sourceEmbed.length) return res.json({ related: [] });

    const scored: { id: string; title: string; score: number }[] = [];
    for (const t of allTopics) {
      if (t.title === topicTitle) continue;
      const e = await generateEmbedding(t.title, ai);
      if (e.length) scored.push({ id: t.id, title: t.title, score: cosineSimilarity(sourceEmbed, e) });
      await new Promise(r => setTimeout(r, 60));
    }
    scored.sort((a, b) => b.score - a.score);
    const result = { related: scored.slice(0, 4).filter(r => r.score > 0.55) };
    chatCache.set(cacheKey, JSON.stringify(result));
    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/related-topics:', error);
    res.status(500).json({ error: error?.message || 'Error finding related topics.' });
  }
});

// ─── /api/extract-youtube ─────────────────────────────────────────────────────
app.post("/api/extract-youtube", rateLimiter, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "YouTube URL is required" });

  // Extract video ID from various YouTube URL formats
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([^&\n?#]+)/);
  if (!videoIdMatch) return res.status(400).json({ error: "Invalid YouTube URL. Use a youtube.com or youtu.be link." });
  const videoId = videoIdMatch[1];

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      return res.status(400).json({ error: "No captions found for this video. Try a video with English captions enabled." });
    }
    const fullText = transcript.map((t: any) => t.text).join(' ');

    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: `You are given a transcript from a YouTube educational video. Extract a structured study plan from it.

TRANSCRIPT:
${fullText.slice(0, 30000)}

Extract a complete study plan hierarchy: Units → Chapters → Topics.
For each Topic: difficulty (Easy/Medium/Complex), importance (High/Medium/Low), a specific practice exercise, a motivational sentence, estimated study time, and revision schedule.
Return as structured JSON with bookTitle (use the video topic as title).` }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bookTitle: { type: Type.STRING },
            units: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  chapters: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        topics: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              title: { type: Type.STRING },
                              difficulty: { type: Type.STRING },
                              importance: { type: Type.STRING },
                              dailyExercise: { type: Type.STRING },
                              motivation: { type: Type.STRING },
                              order: { type: Type.NUMBER },
                              estimatedTime: { type: Type.STRING },
                              revisionSchedule: { type: Type.STRING }
                            },
                            required: ["id", "title", "difficulty", "importance", "dailyExercise", "motivation", "order", "estimatedTime", "revisionSchedule"]
                          }
                        }
                      },
                      required: ["title", "topics"]
                    }
                  }
                },
                required: ["title", "chapters"]
              }
            }
          },
          required: ["bookTitle", "units"]
        }
      }
    });
    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error('Error in /api/extract-youtube:', error);
    const msg = error?.message || '';
    if (msg.includes('Could not retrieve') || msg.includes('Transcript is disabled')) {
      return res.status(400).json({ error: "Captions are disabled for this video. Try a different video with English captions." });
    }
    res.status(500).json({ error: error?.message || 'Error processing YouTube video.' });
  }
});

// ─── Vite middleware setup ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
