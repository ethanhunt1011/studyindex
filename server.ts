import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const LIMIT = 50; // Max 50 requests
const WINDOW = 60 * 1000; // per minute

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const userLimit = rateLimit.get(ip) || { count: 0, resetTime: now + WINDOW };

  if (now > userLimit.resetTime) {
    userLimit.count = 0;
    userLimit.resetTime = now + WINDOW;
  }

  if (userLimit.count >= LIMIT) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  userLimit.count++;
  rateLimit.set(ip, userLimit);
  next();
};

// Simple in-memory storage for file content
const fileContents = new Map<string, string>();
// Simple in-memory cache for chat responses
const chatCache = new Map<string, string>();

const getApiKey = () => {
  // Prioritize VITE_GEMINI_API_KEY as it appears to be the one correctly set in secrets
  const rawKey = process.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  return rawKey?.replace(/['"]/g, '').trim();
};

app.post("/api/upload", express.json({ limit: '50mb' }), (req, res) => {
  const { content, mimeType } = req.body;
  console.log('Upload received, mimeType:', mimeType, 'content length:', content?.length);
  const fileId = Date.now().toString();
  fileContents.set(fileId, JSON.stringify({ content, mimeType }));
  res.json({ fileId });
});

app.post("/api/summarize", rateLimiter, async (req, res) => {
  const { fileId } = req.body;
  const fileData = fileContents.get(fileId);
  console.log('Summarize requested for fileId:', fileId, 'fileData exists:', !!fileData);
  if (!fileData) return res.status(404).json({ error: "File not found" });

  const cacheKey = `sum:${fileId}`;
  if (chatCache.has(cacheKey)) return res.json({ summary: chatCache.get(cacheKey) });

  try {
    const { content, mimeType } = JSON.parse(fileData);
    console.log('Summarizing, mimeType:', mimeType);
    const apiKey = getApiKey();
    
    if (!apiKey) {
      console.error('API key is missing');
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    console.log('API key present:', !!apiKey, 'Starts with:', apiKey.substring(0, 5));
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];
    if (mimeType && mimeType.startsWith('image/')) {
      contents.push({ inlineData: { data: content.split(',')[1], mimeType } });
      contents.push({ text: "Summarize this image. Use a neat, clean, point-based format with bullet points instead of paragraphs." });
    } else {
      contents.push({ text: `Summarize the following text. Use a neat, clean, point-based format with bullet points instead of paragraphs:\n\n${content}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
    });
    console.log('Gemini response received');
    const summary = response.text || "";
    chatCache.set(cacheKey, summary);
    res.json({ summary });
  } catch (error) {
    console.error('Error in summarize:', error);
    res.status(500).json({ error: 'Error generating summary.' });
  }
});

app.post("/api/schedule", rateLimiter, async (req, res) => {
  const { fileId, deadlines } = req.body;
  const content = fileId ? fileContents.get(fileId) : "";
  
  if (!content) return res.status(400).json({ error: "No study material provided." });

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error generating schedule.' });
  }
});

app.post("/api/extract-plan", rateLimiter, async (req, res) => {
  const { fileId } = req.body;
  const fileData = fileContents.get(fileId);
  if (!fileData) return res.status(404).json({ error: "File not found" });

  try {
    const { content, mimeType } = JSON.parse(fileData);
    const apiKey = getApiKey();
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];
    
    if (mimeType && mimeType.startsWith('image/')) {
      contents.push({ inlineData: { data: content.split(',')[1], mimeType } });
    } else {
      contents.push({ text: `Analyze the following text:\n\n${content}` });
    }
    
    contents.push({ text: `Extract the hierarchy: Units -> Chapters -> Topics. 
    For each Topic:
    1. Determine difficulty (Easy, Medium, Complex).
    2. Rate importance (High, Medium, Low).
    3. Provide a specific 'daily exercise' (e.g., a practice problem or deep-dive question).
    4. Provide a highly motivational sentence.
    5. Determine the optimal study sequence (order).
    6. Estimate time to consume (e.g., "30 mins").
    7. Suggest a revision date/schedule (e.g., "Revise in 3 days").
    Return as structured JSON.` });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
  } catch (error) {
    console.error('Error in extract-plan:', error);
    res.status(500).json({ error: 'Error extracting study plan.' });
  }
});

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
      model: 'gemini-3-flash-preview',
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
  } catch (error) {
    console.error('Error in /api/flashcards:', error);
    res.status(500).json({ error: 'Error generating flashcards.' });
  }
});

app.post("/api/chat", rateLimiter, async (req, res) => {
  const { input, fileId } = req.body;
  const fileData = fileId ? fileContents.get(fileId) : null;
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error('API key is not set');
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const cacheKey = `chat:${fileId || 'no-file'}:${input}`;
  if (chatCache.has(cacheKey)) return res.json({ text: chatCache.get(cacheKey) });

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents: any[] = [];
    
    if (fileData) {
      const { content, mimeType } = JSON.parse(fileData);
      if (mimeType && mimeType.startsWith('image/')) {
        contents.push({ inlineData: { data: content.split(',')[1], mimeType } });
      } else {
        contents.push({ text: `Context: ${content}\n\n` });
      }
    }
    contents.push({ text: `Question: ${input}` });
      
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: contents },
      config: {
        systemInstruction: "You are a helpful study buddy. Answer questions based on the provided context if available, otherwise answer generally."
      }
    });
    const text = response.text || "";
    chatCache.set(cacheKey, text);
    res.json({ text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error generating response.' });
  }
});

// Vite middleware setup
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
