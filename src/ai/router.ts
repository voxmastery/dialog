import type { AiResponse, QueryFilters } from '../types.js';
import type { MistralClient } from './mistral.js';
import type { EmbeddingStore } from './embeddings.js';
import { classifyIntent, type Intent } from './prompts.js';

export interface AiRouter {
  handleQuestion(question: string): Promise<AiResponse>;
}

interface StorageAdapter {
  queryLogs(filters: QueryFilters): Promise<readonly { timestamp: Date; service: string; message: string; id: string; level: string | null; path: string | null; status: number | null; error_message: string | null }[]>;
  queryErrors(filters: QueryFilters): Promise<readonly { error_message: string; count: number; first_seen: string; last_seen: string }[]>;
  runSQL?(sql: string): Promise<readonly Record<string, unknown>[]>;
}

export function createAiRouter(
  mistralClient: MistralClient,
  embeddingStore: EmbeddingStore,
  storage: StorageAdapter
): AiRouter {
  async function buildContext(question: string, intent: Intent): Promise<string> {
    const parts: string[] = [];

    // Try SQL-based retrieval
    const sql = await mistralClient.generateSQL(question);
    if (sql && storage.runSQL) {
      try {
        const sqlResults = await storage.runSQL(sql);
        if (sqlResults.length > 0) {
          parts.push('## Database Query Results');
          parts.push(`Query: ${sql}`);
          parts.push(JSON.stringify(sqlResults.slice(0, 20), null, 2));
        }
      } catch {
        // SQL failed, continue with other retrieval
      }
    }

    // Semantic search via RAG
    const semanticResults = await embeddingStore.semanticSearch(question, 10);
    if (semanticResults.length > 0) {
      parts.push('## Semantically Related Logs');
      for (const r of semanticResults) {
        parts.push(`- [${r.metadata['timestamp'] ?? ''}] [${r.metadata['service'] ?? ''}] ${r.text}`);
      }
    }

    // Intent-specific data
    if (intent === 'error_analysis') {
      const errors = await storage.queryErrors({ last: '1h', limit: 20 });
      if (errors.length > 0) {
        parts.push('## Recent Errors (last 1 hour)');
        for (const e of errors) {
          parts.push(`- "${e.error_message}" (${e.count}x, last: ${e.last_seen})`);
        }
      }
    }

    if (intent === 'health_check') {
      const recentLogs = await storage.queryLogs({ last: '5m', limit: 100 });
      const errorCount = recentLogs.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length;
      parts.push('## Health Summary (last 5 minutes)');
      parts.push(`Total logs: ${recentLogs.length}, Errors: ${errorCount}`);
      const services = [...new Set(recentLogs.map(l => l.service))];
      parts.push(`Active services: ${services.join(', ') || 'none'}`);
    }

    if (parts.length === 0) {
      // Fallback: get recent logs
      const recent = await storage.queryLogs({ last: '30m', limit: 30 });
      if (recent.length > 0) {
        parts.push('## Recent Logs (last 30 minutes)');
        for (const l of recent) {
          parts.push(`[${l.timestamp.toISOString()}] [${l.service}] [${l.level ?? 'INFO'}] ${l.message}`);
        }
      } else {
        parts.push('No log data available yet. The application may have just started monitoring.');
      }
    }

    return parts.join('\n');
  }

  return {
    async handleQuestion(question: string): Promise<AiResponse> {
      if (!question.trim()) {
        return { success: false, answer: null, citations: [], error: 'Please provide a question.' };
      }

      if (!mistralClient.isAvailable()) {
        // Fall back to showing raw data without AI
        const errors = await storage.queryErrors({ last: '1h', limit: 10 });
        const logs = await storage.queryLogs({ last: '30m', limit: 20 });

        const fallback = [
          'AI is not available (no API key configured).',
          '',
          errors.length > 0
            ? `Recent errors:\n${errors.map(e => `  - "${e.error_message}" (${e.count}x)`).join('\n')}`
            : 'No recent errors.',
          '',
          `Recent logs: ${logs.length} entries in last 30 minutes.`,
        ].join('\n');

        return { success: true, answer: fallback, citations: [], error: null };
      }

      const intent = classifyIntent(question);

      // Select model based on complexity
      const isComplex = question.split(' ').length > 15 || question.includes(' and ');
      const model = isComplex ? 'medium' as const : 'small' as const;

      const context = await buildContext(question, intent);
      const response = await mistralClient.askMagistral(question, context, model);

      if (!response.success) {
        return {
          success: false,
          answer: null,
          citations: [],
          error: response.error ?? 'AI query failed',
        };
      }

      return {
        success: true,
        answer: response.answer,
        citations: [],
        error: null,
      };
    },
  };
}
