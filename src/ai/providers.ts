import { createMistralClient, type MistralClient, type MistralResponse } from './mistral.js';
import { createGeminiClient, type GeminiClient } from './gemini.js';

/**
 * Unified AI provider that tries Gemini first, falls back to Mistral.
 * Implements the same MistralClient interface so existing code works unchanged.
 */
export interface UnifiedAiClient {
  askAI(question: string, context: string, model?: 'small' | 'medium'): Promise<MistralResponse>;
  generateSQL(question: string): Promise<string | null>;
  embedTexts(texts: readonly string[]): Promise<readonly number[][]>;
  isAvailable(): boolean;
  activeProvider(): string;
}

export function createUnifiedAiClient(): UnifiedAiClient & MistralClient {
  const gemini = createGeminiClient();
  const mistral = createMistralClient();
  let lastProvider = 'none';

  const unified: UnifiedAiClient & MistralClient = {
    isAvailable(): boolean {
      return gemini.isAvailable() || mistral.isAvailable();
    },

    activeProvider(): string {
      return lastProvider;
    },

    async askAI(question: string, context: string, _model?: 'small' | 'medium'): Promise<MistralResponse> {
      // Try Gemini first
      if (gemini.isAvailable()) {
        const geminiResult = await gemini.askGemini(question, context);
        if (geminiResult.success) {
          lastProvider = 'gemini';
          return geminiResult;
        }
        // Gemini failed, try Mistral
      }

      // Fallback to Mistral
      if (mistral.isAvailable()) {
        const mistralResult = await mistral.askMagistral(question, context, _model);
        if (mistralResult.success) {
          lastProvider = 'mistral';
          return mistralResult;
        }
        return mistralResult;
      }

      return {
        success: false,
        answer: null,
        error: 'No AI provider available. Set GEMINI_API_KEY or DIALOG_MISTRAL_KEY.',
      };
    },

    // Alias for backward compatibility
    async askMagistral(question: string, context: string, model?: 'small' | 'medium'): Promise<MistralResponse> {
      return unified.askAI(question, context, model);
    },

    async generateSQL(question: string): Promise<string | null> {
      // Try Gemini first
      if (gemini.isAvailable()) {
        const result = await gemini.generateSQL(question);
        if (result) return result;
      }
      // Fallback to Mistral
      if (mistral.isAvailable()) {
        return mistral.generateSQL(question);
      }
      return null;
    },

    async embedTexts(texts: readonly string[]): Promise<readonly number[][]> {
      // Try Gemini first
      if (gemini.isAvailable()) {
        const result = await gemini.embedTexts(texts);
        if (result.length > 0) return result;
      }
      // Fallback to Mistral
      if (mistral.isAvailable()) {
        return mistral.embedTexts(texts);
      }
      return [];
    },
  };

  return unified;
}
