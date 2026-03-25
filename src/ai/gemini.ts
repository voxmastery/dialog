import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, SQL_GENERATION_PROMPT } from './prompts.js';

const GEMINI_API_KEY = process.env['GEMINI_API_KEY'] ?? '';

const MODELS = {
  flash: 'gemini-2.0-flash',
  embed: 'text-embedding-004',
} as const;

const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1000;

export interface GeminiClient {
  askGemini(question: string, context: string): Promise<GeminiResponse>;
  generateSQL(question: string): Promise<string | null>;
  embedTexts(texts: readonly string[]): Promise<readonly number[][]>;
  isAvailable(): boolean;
}

export interface GeminiResponse {
  readonly success: boolean;
  readonly answer: string | null;
  readonly error: string | null;
}

export function createGeminiClient(): GeminiClient {
  const available = GEMINI_API_KEY.length > 0;
  const genAI = available ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

  async function retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;
        if (attempt < MAX_RETRIES - 1) {
          const delay = RETRY_BASE_MS * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  return {
    isAvailable(): boolean {
      return available;
    },

    async askGemini(question: string, context: string): Promise<GeminiResponse> {
      if (!genAI) {
        return { success: false, answer: null, error: 'Gemini not configured. Set GEMINI_API_KEY.' };
      }

      try {
        const model = genAI.getGenerativeModel({
          model: MODELS.flash,
          systemInstruction: SYSTEM_PROMPT,
        });

        const result = await retryWithBackoff(() =>
          model.generateContent(`Context:\n${context}\n\nQuestion: ${question}`)
        );

        const answer = result.response.text();
        if (answer) {
          return { success: true, answer, error: null };
        }
        return { success: false, answer: null, error: 'No response from Gemini' };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, answer: null, error: `Gemini error: ${message}` };
      }
    },

    async generateSQL(question: string): Promise<string | null> {
      if (!genAI) return null;

      try {
        const model = genAI.getGenerativeModel({ model: MODELS.flash });
        const result = await retryWithBackoff(() =>
          model.generateContent(SQL_GENERATION_PROMPT + question)
        );

        const sql = result.response.text();
        if (!sql) return null;

        const cleaned = sql.trim().replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
        const upper = cleaned.toUpperCase();
        const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE'];
        if (forbidden.some(kw => upper.includes(kw)) || !upper.startsWith('SELECT')) {
          return null;
        }
        return cleaned;
      } catch {
        return null;
      }
    },

    async embedTexts(texts: readonly string[]): Promise<readonly number[][]> {
      if (!genAI || texts.length === 0) return [];

      try {
        const model = genAI.getGenerativeModel({ model: MODELS.embed });
        const results: number[][] = [];

        // Gemini embeds one at a time (or batch with embedContent)
        for (const text of texts) {
          const result = await model.embedContent(text);
          results.push(result.embedding.values);
        }

        return results;
      } catch {
        return [];
      }
    },
  };
}
