import { Mistral } from '@mistralai/mistralai';
import { SYSTEM_PROMPT, SQL_GENERATION_PROMPT } from './prompts.js';
import { logger } from '../lib/logger.js';

const MISTRAL_API_KEY = process.env['DIALOG_MISTRAL_KEY'] ?? process.env['MISTRAL_API_KEY'] ?? '';

const MODELS = {
  small: 'magistral-small-2509',
  medium: 'magistral-medium-2509',
  embed: 'mistral-embed',
} as const;

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;

export interface MistralClient {
  askMagistral(question: string, context: string, model?: 'small' | 'medium'): Promise<MistralResponse>;
  generateSQL(question: string): Promise<string | null>;
  embedTexts(texts: readonly string[]): Promise<readonly number[][]>;
  isAvailable(): boolean;
}

export interface MistralResponse {
  readonly success: boolean;
  readonly answer: string | null;
  readonly error: string | null;
}

export function createMistralClient(): MistralClient {
  const available = MISTRAL_API_KEY.length > 0;

  const client = available ? new Mistral({ apiKey: MISTRAL_API_KEY }) : null;

  async function retryWithBackoff<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        lastError = err;
        const isRateLimit = err instanceof Error && err.message.includes('429');
        if (!isRateLimit && attempt > 0) throw err;
        const delay = RETRY_BASE_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  return {
    isAvailable(): boolean {
      return available;
    },

    async askMagistral(
      question: string,
      context: string,
      model: 'small' | 'medium' = 'small'
    ): Promise<MistralResponse> {
      if (!client) {
        return { success: false, answer: null, error: 'AI not configured. Set DIALOG_MISTRAL_KEY environment variable.' };
      }

      try {
        const result = await retryWithBackoff(() =>
          client.chat.complete({
            model: MODELS[model],
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
            ],
            temperature: 0.3,
            maxTokens: 2000,
          })
        );

        const answer = result.choices?.[0]?.message?.content;
        if (typeof answer === 'string') {
          return { success: true, answer, error: null };
        }
        return { success: false, answer: null, error: 'No response from AI' };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, answer: null, error: `AI temporarily unavailable: ${message}` };
      }
    },

    async generateSQL(question: string): Promise<string | null> {
      if (!client) return null;

      try {
        const result = await retryWithBackoff(() =>
          client.chat.complete({
            model: MODELS.small,
            messages: [
              { role: 'user', content: SQL_GENERATION_PROMPT + question },
            ],
            temperature: 0.1,
            maxTokens: 500,
          })
        );

        const sql = result.choices?.[0]?.message?.content;
        if (typeof sql !== 'string') return null;

        const cleaned = sql.trim().replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();

        // Safety: only allow SELECT
        const upper = cleaned.toUpperCase();
        const forbidden = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE'];
        if (forbidden.some(kw => upper.includes(kw))) {
          return null;
        }

        if (!upper.startsWith('SELECT')) {
          return null;
        }

        return cleaned;
      } catch (err) {
        logger.debug({ err }, 'Mistral SQL generation failed');
        return null;
      }
    },

    async embedTexts(texts: readonly string[]): Promise<readonly number[][]> {
      if (!client || texts.length === 0) return [];

      try {
        const result = await retryWithBackoff(() =>
          client.embeddings.create({
            model: MODELS.embed,
            inputs: [...texts],
          })
        );

        return result.data.map(d => d.embedding as number[]);
      } catch (err) {
        logger.debug({ err, textCount: texts.length }, 'Mistral embedding failed');
        return [];
      }
    },
  };
}
