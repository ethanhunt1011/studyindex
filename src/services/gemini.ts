import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

/**
 * Lazy initialization of the Gemini AI instance.
 * Following guidelines: Always use process.env.GEMINI_API_KEY.
 */
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please ensure it is set in the AI Studio settings.");
    }

    try {
      aiInstance = new GoogleGenAI({ apiKey });
      console.log('[Gemini Service] Initialized successfully');
    } catch (error) {
      console.error('[Gemini Service] Failed to initialize:', error);
      throw error;
    }
  }
  return aiInstance;
}

export interface Topic {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Complex';
  importance: 'High' | 'Medium' | 'Low';
  dailyExercise: string;
  motivation: string;
  order: number;
}

export interface Chapter {
  id: string;
  title: string;
  topics: Topic[];
  order: number;
}

export interface Unit {
  id: string;
  title: string;
  chapters: Chapter[];
  order: number;
}

export async function extractTopicsFromImage(base64Image: string): Promise<{ bookTitle: string; units: Unit[] }> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `Analyze this book index and extract the hierarchy: Units -> Chapters -> Topics. 
            For each Topic:
            1. Determine difficulty (Easy, Medium, Complex).
            2. Rate importance (High, Medium, Low).
            3. Provide a specific 'daily exercise' (e.g., a practice problem or deep-dive question).
            4. Provide a highly motivational sentence.
            5. Determine the optimal study sequence (order).
            Return as structured JSON.`,
          },
        ],
      },
    ],
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
                            title: { type: Type.STRING },
                            difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Complex"] },
                            importance: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                            dailyExercise: { type: Type.STRING },
                            motivation: { type: Type.STRING }
                          },
                          required: ["title", "difficulty", "importance", "dailyExercise", "motivation"]
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

  let result;
  try {
    result = JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    throw new Error("Failed to parse response from AI.");
  }
  
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  return {
    bookTitle: result.bookTitle || "Unknown Book",
    units: (result.units || []).map((u: any, uIdx: number) => ({
      id: generateId(),
      title: u.title,
      order: uIdx,
      chapters: (u.chapters || []).map((c: any, cIdx: number) => ({
        id: generateId(),
        title: c.title,
        order: cIdx,
        topics: (c.topics || []).map((t: any, tIdx: number) => ({
          id: generateId(),
          title: t.title,
          difficulty: t.difficulty || 'Medium',
          importance: t.importance || 'Medium',
          dailyExercise: t.dailyExercise || 'Review the core concepts.',
          motivation: t.motivation || 'Keep pushing forward!',
          order: tIdx
        }))
      }))
    }))
  };
}

export interface Flashcard {
  id: string;
  topicId: string;
  question: string;
  answer: string;
}

export async function generateFlashcards(topicTitle: string, topicId: string): Promise<Flashcard[]> {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        text: `Generate 3 high-quality flashcards (Question and Answer) for the study topic: "${topicTitle}". 
        The questions should be challenging but concise. 
        Return as structured JSON.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ["question", "answer"]
        }
      }
    }
  });

  let result;
  try {
    result = JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    throw new Error("Failed to parse flashcards from AI.");
  }
  
  return result.map((f: any) => ({
    id: Math.random().toString(36).substring(2, 15),
    topicId,
    question: f.question,
    answer: f.answer
  }));
}
