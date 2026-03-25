import type { LogStorage } from '../storage/duckdb.js';
import type { JourneyIndex } from '../journey/index.js';
import type { MistralClient } from '../ai/mistral.js';
import type { EmbeddingStore } from '../ai/embeddings.js';
import type { AiRouter } from '../ai/router.js';
import type { DialogConfig } from '../types.js';

/**
 * Shared context injected into every MCP tool handler.
 * Provides access to all Dialog subsystems without global state.
 */
export interface ToolContext {
  readonly storage: LogStorage;
  readonly journeyIndex: JourneyIndex;
  readonly mistralClient: MistralClient;
  readonly embeddingStore: EmbeddingStore;
  readonly aiRouter: AiRouter;
  readonly config: DialogConfig;
}

/**
 * Standard envelope for all MCP tool responses.
 * Ensures consistent structure across all 8 tools.
 */
export interface ToolResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
  readonly metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  readonly timestamp: string;
  readonly tool: string;
  readonly duration_ms: number;
}

export function createSuccessResponse<T>(tool: string, data: T, startTime: number): ToolResponse<T> {
  return {
    success: true,
    data,
    error: null,
    metadata: {
      timestamp: new Date().toISOString(),
      tool,
      duration_ms: Date.now() - startTime,
    },
  };
}

export function createErrorResponse<T>(tool: string, error: string, startTime: number): ToolResponse<T> {
  return {
    success: false,
    data: null,
    error,
    metadata: {
      timestamp: new Date().toISOString(),
      tool,
      duration_ms: Date.now() - startTime,
    },
  };
}

/**
 * Format a ToolResponse into MCP CallToolResult content.
 */
export function toMcpContent<T>(response: ToolResponse<T>): { type: 'text'; text: string }[] {
  return [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }];
}
