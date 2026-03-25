import { type MistralClient, type MistralResponse } from './mistral.js';
import { createGroqClient } from './groq.js';
import { createOpenRouterClient } from './openrouter.js';

/**
 * Unified AI provider — Groq primary, OpenRouter fallback.
 *   Chat: Groq (Llama 3.3 70B) → OpenRouter (DeepSeek V3)
 *   SQL:  Groq → OpenRouter
 *   Embed: Not supported (embeddings disabled without Gemini/Mistral)
 */
export interface UnifiedAiClient {
  askAI(question: string, context: string, model?: 'small' | 'medium'): Promise<MistralResponse>;
  generateSQL(question: string): Promise<string | null>;
  embedTexts(texts: readonly string[]): Promise<readonly number[][]>;
  isAvailable(): boolean;
  activeProvider(): string;
}

export function createUnifiedAiClient(): UnifiedAiClient & MistralClient {
  const groq = createGroqClient();
  const openrouter = createOpenRouterClient();
  let lastProvider = 'none';

  const unified: UnifiedAiClient & MistralClient = {
    isAvailable(): boolean {
      return groq.isAvailable() || openrouter.isAvailable();
    },

    activeProvider(): string {
      return lastProvider;
    },

    async askAI(question: string, context: string, _model?: 'small' | 'medium'): Promise<MistralResponse> {
      // 1. Groq (fastest, Llama 3.3 70B)
      if (groq.isAvailable()) {
        const r = await groq.askGroq(question, context);
        if (r.success) { lastProvider = 'groq'; return r; }
      }

      // 2. OpenRouter (DeepSeek V3, many free models)
      if (openrouter.isAvailable()) {
        const r = await openrouter.askOpenRouter(question, context);
        if (r.success) { lastProvider = 'openrouter'; return r; }
      }

      return {
        success: false,
        answer: null,
        error: 'All AI providers exhausted. Set GROQ_API_KEY or OPENROUTER_API_KEY.',
      };
    },

    async askMagistral(question: string, context: string, model?: 'small' | 'medium'): Promise<MistralResponse> {
      return unified.askAI(question, context, model);
    },

    async generateSQL(question: string): Promise<string | null> {
      if (groq.isAvailable()) { const r = await groq.generateSQL(question); if (r) return r; }
      if (openrouter.isAvailable()) { const r = await openrouter.generateSQL(question); if (r) return r; }
      return null;
    },

    async embedTexts(_texts: readonly string[]): Promise<readonly number[][]> {
      // Embeddings not supported without Gemini/Mistral — RAG disabled
      return [];
    },
  };

  return unified;
}
