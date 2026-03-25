import { SYSTEM_PROMPT, SQL_GENERATION_PROMPT } from './prompts.js';

const OPENROUTER_API_KEY = process.env['OPENROUTER_API_KEY'] ?? '';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-chat-v3-0324:free';

export interface OpenRouterResponse {
  readonly success: boolean;
  readonly answer: string | null;
  readonly error: string | null;
}

export function createOpenRouterClient() {
  const available = OPENROUTER_API_KEY.length > 0;

  async function chat(messages: { role: string; content: string }[], temp = 0.3, maxTokens = 2000): Promise<string | null> {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://dialog.dev',
        'X-Title': 'Dialog',
      },
      body: JSON.stringify({ model: MODEL, messages, temperature: temp, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  }

  return {
    isAvailable: () => available,

    async askOpenRouter(question: string, context: string): Promise<OpenRouterResponse> {
      if (!available) return { success: false, answer: null, error: 'OpenRouter not configured.' };
      try {
        const answer = await chat([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
        ]);
        return answer ? { success: true, answer, error: null } : { success: false, answer: null, error: 'No response' };
      } catch (err) {
        return { success: false, answer: null, error: `OpenRouter: ${err instanceof Error ? err.message : 'unknown'}` };
      }
    },

    async generateSQL(question: string): Promise<string | null> {
      if (!available) return null;
      try {
        const sql = await chat([{ role: 'user', content: SQL_GENERATION_PROMPT + question }], 0.1, 500);
        if (!sql) return null;
        const cleaned = sql.trim().replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
        const upper = cleaned.toUpperCase();
        if (['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE'].some(kw => upper.includes(kw))) return null;
        return upper.startsWith('SELECT') ? cleaned : null;
      } catch { return null; }
    },
  };
}
