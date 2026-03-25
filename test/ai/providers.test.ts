import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the sub-providers before importing the module under test
vi.mock('../../src/ai/groq.js', () => ({
  createGroqClient: vi.fn(),
}));
vi.mock('../../src/ai/openrouter.js', () => ({
  createOpenRouterClient: vi.fn(),
}));

import { createUnifiedAiClient } from '../../src/ai/providers.js';
import { createGroqClient } from '../../src/ai/groq.js';
import { createOpenRouterClient } from '../../src/ai/openrouter.js';

const mockGroqClient = {
  isAvailable: vi.fn(),
  askGroq: vi.fn(),
  generateSQL: vi.fn(),
};

const mockOpenRouterClient = {
  isAvailable: vi.fn(),
  askOpenRouter: vi.fn(),
  generateSQL: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createGroqClient).mockReturnValue(mockGroqClient as ReturnType<typeof createGroqClient>);
  vi.mocked(createOpenRouterClient).mockReturnValue(mockOpenRouterClient as ReturnType<typeof createOpenRouterClient>);
});

describe('UnifiedAiClient', () => {
  describe('askAI fallback chain', () => {
    it('returns Groq result when Groq succeeds — OpenRouter is not called', async () => {
      mockGroqClient.isAvailable.mockReturnValue(true);
      mockGroqClient.askGroq.mockResolvedValue({ success: true, answer: 'groq answer', error: null });

      const client = createUnifiedAiClient();
      const result = await client.askAI('what happened?', 'ctx');

      expect(result).toEqual({ success: true, answer: 'groq answer', error: null });
      expect(mockOpenRouterClient.askOpenRouter).not.toHaveBeenCalled();
    });

    it('falls back to OpenRouter when Groq fails', async () => {
      mockGroqClient.isAvailable.mockReturnValue(true);
      mockGroqClient.askGroq.mockResolvedValue({ success: false, answer: null, error: 'Groq error' });
      mockOpenRouterClient.isAvailable.mockReturnValue(true);
      mockOpenRouterClient.askOpenRouter.mockResolvedValue({ success: true, answer: 'openrouter answer', error: null });

      const client = createUnifiedAiClient();
      const result = await client.askAI('what happened?', 'ctx');

      expect(result).toEqual({ success: true, answer: 'openrouter answer', error: null });
      expect(mockGroqClient.askGroq).toHaveBeenCalledOnce();
      expect(mockOpenRouterClient.askOpenRouter).toHaveBeenCalledOnce();
    });

    it('returns error when both providers fail', async () => {
      mockGroqClient.isAvailable.mockReturnValue(true);
      mockGroqClient.askGroq.mockResolvedValue({ success: false, answer: null, error: 'Groq down' });
      mockOpenRouterClient.isAvailable.mockReturnValue(true);
      mockOpenRouterClient.askOpenRouter.mockResolvedValue({ success: false, answer: null, error: 'OR down' });

      const client = createUnifiedAiClient();
      const result = await client.askAI('what happened?', 'ctx');

      expect(result.success).toBe(false);
      expect(result.answer).toBeNull();
      expect(result.error).toContain('All AI providers exhausted');
    });
  });

  describe('isAvailable', () => {
    it('returns true when at least one provider is available', () => {
      mockGroqClient.isAvailable.mockReturnValue(false);
      mockOpenRouterClient.isAvailable.mockReturnValue(true);

      const client = createUnifiedAiClient();
      expect(client.isAvailable()).toBe(true);
    });

    it('returns false when no providers are available', () => {
      mockGroqClient.isAvailable.mockReturnValue(false);
      mockOpenRouterClient.isAvailable.mockReturnValue(false);

      const client = createUnifiedAiClient();
      expect(client.isAvailable()).toBe(false);
    });
  });

  describe('generateSQL', () => {
    it('tries providers in order — returns Groq result first', async () => {
      mockGroqClient.isAvailable.mockReturnValue(true);
      mockGroqClient.generateSQL.mockResolvedValue('SELECT * FROM logs LIMIT 10');
      mockOpenRouterClient.isAvailable.mockReturnValue(true);

      const client = createUnifiedAiClient();
      const sql = await client.generateSQL('show recent logs');

      expect(sql).toBe('SELECT * FROM logs LIMIT 10');
      expect(mockOpenRouterClient.generateSQL).not.toHaveBeenCalled();
    });

    it('falls back to OpenRouter when Groq returns null', async () => {
      mockGroqClient.isAvailable.mockReturnValue(true);
      mockGroqClient.generateSQL.mockResolvedValue(null);
      mockOpenRouterClient.isAvailable.mockReturnValue(true);
      mockOpenRouterClient.generateSQL.mockResolvedValue('SELECT * FROM logs LIMIT 50');

      const client = createUnifiedAiClient();
      const sql = await client.generateSQL('show recent logs');

      expect(sql).toBe('SELECT * FROM logs LIMIT 50');
    });
  });

  describe('embedTexts', () => {
    it('returns empty array — no embed providers configured', async () => {
      mockGroqClient.isAvailable.mockReturnValue(true);
      mockOpenRouterClient.isAvailable.mockReturnValue(true);

      const client = createUnifiedAiClient();
      const result = await client.embedTexts(['hello', 'world']);

      expect(result).toEqual([]);
    });
  });
});
