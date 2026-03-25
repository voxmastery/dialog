import { SYSTEM_PROMPT, SQL_GENERATION_PROMPT } from './prompts.js';

const GROQ_API_KEY = process.env['GROQ_API_KEY'] ?? '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export interface GroqResponse {
  readonly success: boolean;
  readonly answer: string | null;
  readonly error: string | null;
}

export function createGroqClient() {
  const available = GROQ_API_KEY.length > 0;

  async function chat(messages: { role: string; content: string }[], temp = 0.3, maxTokens = 2000): Promise<string | null> {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: temp, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  }

  return {
    isAvailable: () => available,

    async askGroq(question: string, context: string): Promise<GroqResponse> {
      if (!available) return { success: false, answer: null, error: 'Groq not configured.' };
      try {
        const answer = await chat([
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
        ]);
        return answer ? { success: true, answer, error: null } : { success: false, answer: null, error: 'No response' };
      } catch (err) {
        return { success: false, answer: null, error: `Groq: ${err instanceof Error ? err.message : 'unknown'}` };
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
