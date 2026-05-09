import 'dotenv/config';   // load .env in local dev (no-op when env vars already set)
import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 50 MB global limit — upload route sends base64-encoded files in JSON body
app.use(express.json({ limit: '50mb' }));

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

/** Convert a stored base64 data-URI into Gemini content parts */
function fileToContentParts(content: string, mimeType: string): any[] {
  if (mimeType && (mimeType.startsWith('image/') || mimeType === 'application/pdf')) {
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

/** Decode a stored base64 data-URI to plain text (for RAG chunking) */
function decodeToText(content: string): string {
  if (!content.includes(',')) return content;
  try { return Buffer.from(content.split(',')[1], 'base64').toString('utf-8'); }
  catch { return content; }
}

// ─── /api/upload ──────────────────────────────────────────────────────────────
app.post("/api/upload", (req, res) => {
  const { content, mimeType } = req.body;
  console.log('Upload received, mimeType:', mimeType, 'content length:', content?.length);
  const fileId = Date.now().toString();
  fileContents.set(fileId, JSON.stringify({ content, mimeType }));
  res.json({ fileId });

  // Non-blocking: chunk + embed text documents for RAG pipeline
  if (!mimeType?.startsWith('image/') && mimeType !== 'application/pdf') {
    setImmediate(async () => {
      try {
        const apiKey = getApiKey();
        if (!apiKey) return;
        const textContent = decodeToText(content);
        const chunks = chunkText(textContent);
        if (!chunks.length) return;
        console.log(`RAG: embedding ${chunks.length} chunks for fileId ${fileId}`);
        const ai = new GoogleGenAI({ apiKey });
        const embeddings: number[][] = [];
        for (const chunk of chunks) {
          embeddings.push(await generateEmbedding(chunk, ai));
          await new Promise(r => setTimeout(r, 80)); // gentle rate-limit
        }
        documentChunks.set(fileId, {
          chunks,
          embeddings,
          embeddedAt: Date.now(),
          model: 'text-embedding-004',
        });
        console.log(`RAG: ready — ${embeddings.filter(e => e.length).length}/${chunks.length} chunks embedded`);
      } catch (err) {
        console.error('RAG background embedding error:', err);
      }
    });
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
    const { content, mimeType } = JSON.parse(fileData);
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });

    const ai = new GoogleGenAI({ apiKey });
    const fileParts = fileToContentParts(content, mimeType);
    const instruction = mimeType?.startsWith('image/')
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
    const { content, mimeType } = JSON.parse(fileData);
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const fileParts = fileToContentParts(content, mimeType);
    const contents: any[] = [
      ...fileParts,
      { text: `Extract the hierarchy: Units -> Chapters -> Topics.
    For each Topic:
    1. Determine difficulty (Easy, Medium, Complex).
    2. Rate importance (High, Medium, Low).
    3. Provide a specific 'daily exercise' (e.g., a practice problem or deep-dive question).
    4. Provide a highly motivational sentence.
    5. Determine the optimal study sequence (order).
    6. Estimate time to consume (e.g., "30 mins").
    7. Suggest a revision date/schedule (e.g., "Revise in 3 days").
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
      const { content, mimeType } = JSON.parse(fileData);
      const ragData = fileId ? documentChunks.get(fileId) : null;

      if (ragData && ragData.embeddings.some(e => e.length > 0)) {
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
          // Query embedding worked but nothing was relevant enough — use full doc
          contents.push(...fileToContentParts(content, mimeType));
        }
      } else {
        // No embeddings (image/PDF or still computing) — full-doc fallback
        contents.push(...fileToContentParts(content, mimeType));
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
  const { topicTitle, context } = req.body;
  if (!topicTitle) return res.status(400).json({ error: "topicTitle is required" });

  const cacheKey = `notes:${topicTitle}`;
  if (chatCache.has(cacheKey)) return res.json(JSON.parse(chatCache.get(cacheKey)!));

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate concise, high-quality study notes for: "${topicTitle}".${context ? ` Context: ${context}` : ''}
Focus on what a student needs to know to understand and remember this topic well.`,
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
            memoryTip:      { type: Type.STRING },
          },
          required: ["summary", "keyConcepts", "keyPoints", "examples", "commonMistakes", "memoryTip"]
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
  const { topicTitle, context } = req.body;
  if (!topicTitle) return res.status(400).json({ error: "topicTitle is required" });

  try {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: 'Server configuration error.' });
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Create a practice exam for the topic: "${topicTitle}".${context ? ` Context: ${context}` : ''}
Generate exactly 4 multiple-choice questions and 1 short-answer question.
For each MCQ: provide exactly 4 answer options (as an array). The correctAnswer field must be the FULL TEXT of the correct option, matching exactly one option in the array.
Make questions progressively harder. Be specific, clear, and educational.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
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
              }
            }
          },
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
