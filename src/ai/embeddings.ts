import type { ParsedLogEntry } from '../types.js';
import type { MistralClient } from './mistral.js';
import { logger } from '../lib/logger.js';

export interface EmbeddingStore {
  init(): Promise<void>;
  embedAndStore(entries: readonly ParsedLogEntry[]): Promise<void>;
  semanticSearch(query: string, k?: number): Promise<readonly SemanticResult[]>;
}

export interface SemanticResult {
  readonly logId: string;
  readonly text: string;
  readonly score: number;
  readonly metadata: Record<string, string>;
}

export function createEmbeddingStore(
  mistralClient: MistralClient,
  chromaUrl?: string
): EmbeddingStore {
  let collection: any = null;
  let chromaClient: any = null;

  return {
    async init(): Promise<void> {
      try {
        const { ChromaClient } = await import('chromadb');
        chromaClient = new ChromaClient({ path: chromaUrl ?? 'http://localhost:8000' });
        collection = await chromaClient.getOrCreateCollection({
          name: 'dialog_logs',
          metadata: { 'hnsw:space': 'cosine' },
        });
      } catch (err) {
        logger.debug({ err }, 'ChromaDB not available — semantic search will return empty results');
        collection = null;
      }
    },

    async embedAndStore(entries: readonly ParsedLogEntry[]): Promise<void> {
      if (!collection || !mistralClient.isAvailable() || entries.length === 0) return;

      const texts = entries.map(e => {
        const parts = [e.message];
        if (e.error_message) parts.push(e.error_message);
        if (e.path) parts.push(`${e.method ?? ''} ${e.path}`);
        return parts.join(' | ');
      });

      const embeddings = await mistralClient.embedTexts(texts);
      if (embeddings.length === 0) return;

      try {
        await collection.add({
          ids: entries.map(e => e.id),
          embeddings: [...embeddings],
          documents: texts,
          metadatas: entries.map(e => ({
            timestamp: e.timestamp.toISOString(),
            service: e.service,
            level: e.level ?? 'UNKNOWN',
            path: e.path ?? '',
          })),
        });
      } catch (err) {
        logger.debug({ err, entryCount: entries.length }, 'Failed to store embeddings');
      }
    },

    async semanticSearch(query: string, k: number = 10): Promise<readonly SemanticResult[]> {
      if (!collection || !mistralClient.isAvailable()) return [];

      try {
        const queryEmbedding = await mistralClient.embedTexts([query]);
        if (queryEmbedding.length === 0) return [];

        const results = await collection.query({
          queryEmbeddings: [...queryEmbedding],
          nResults: k,
        });

        if (!results.ids?.[0]) return [];

        return results.ids[0].map((id: string, i: number) => ({
          logId: id,
          text: results.documents?.[0]?.[i] ?? '',
          score: results.distances?.[0]?.[i] ?? 0,
          metadata: results.metadatas?.[0]?.[i] ?? {},
        }));
      } catch (err) {
        logger.debug({ err, query }, 'Semantic search failed');
        return [];
      }
    },
  };
}
