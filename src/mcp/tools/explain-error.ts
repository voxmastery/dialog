import { z } from 'zod';
import type { ToolContext } from '../types.js';
import { createSuccessResponse, createErrorResponse, type ToolResponse } from '../types.js';

export const TOOL_NAME = 'dialog_explain_error';
export const TOOL_DESCRIPTION = 'Get an AI-powered explanation of a specific error, including probable root cause analysis and suggested fixes. Provide either an error ID from the logs or raw error text.';

export const inputSchema = {
  error_id: z.string()
    .describe('ID of a specific log entry to explain')
    .optional(),
  error_text: z.string()
    .describe('Raw error text or message to explain (if error_id is not available)')
    .optional(),
};

export interface ExplainErrorResult {
  readonly error_text: string;
  readonly explanation: string;
  readonly stack_trace: string | null;
  readonly related_logs: readonly RelatedLog[];
  readonly ai_available: boolean;
}

interface RelatedLog {
  readonly timestamp: string;
  readonly service: string;
  readonly message: string;
  readonly level: string | null;
}

export async function handler(
  args: { error_id?: string; error_text?: string },
  ctx: ToolContext
): Promise<ToolResponse<ExplainErrorResult>> {
  const startTime = Date.now();

  if (!args.error_id && !args.error_text) {
    return createErrorResponse(TOOL_NAME, 'Provide either error_id or error_text', startTime);
  }

  try {
    let errorText = args.error_text ?? '';
    let stackTrace: string | null = null;
    const relatedLogs: RelatedLog[] = [];

    // If error_id provided, fetch the actual log entry
    if (args.error_id) {
      const logEntry = await ctx.storage.getLogById(args.error_id);
      if (!logEntry) {
        return createErrorResponse(TOOL_NAME, `Log entry not found: ${args.error_id}`, startTime);
      }
      errorText = logEntry.error_message ?? logEntry.message;
      stackTrace = logEntry.stack_trace;

      // Get related logs (same service, nearby time window)
      const nearby = await ctx.storage.queryLogs({
        service: logEntry.service,
        last: '5m',
        limit: 20,
      });

      for (const log of nearby) {
        if (log.id !== args.error_id) {
          relatedLogs.push({
            timestamp: log.timestamp.toISOString(),
            service: log.service,
            message: log.message,
            level: log.level,
          });
        }
      }
    }

    // Build context for AI
    const contextParts = [
      `Error: ${errorText}`,
      stackTrace ? `Stack trace:\n${stackTrace}` : null,
      relatedLogs.length > 0
        ? `Related logs:\n${relatedLogs.map(l => `  [${l.timestamp}] [${l.level}] ${l.message}`).join('\n')}`
        : null,
    ].filter(Boolean).join('\n\n');

    const question = `Explain this error and suggest a fix: ${errorText}`;
    const response = await ctx.aiRouter.handleQuestion(question);

    const explanation = response.success && response.answer
      ? response.answer
      : `Error: ${errorText}${stackTrace ? `\n\nStack trace present (${stackTrace.split('\n').length} frames). Check the stack trace for the origin of the error.` : ''}`;

    return createSuccessResponse(TOOL_NAME, {
      error_text: errorText,
      explanation,
      stack_trace: stackTrace,
      related_logs: relatedLogs.slice(0, 10),
      ai_available: ctx.mistralClient.isAvailable(),
    }, startTime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error explaining error';
    return createErrorResponse(TOOL_NAME, msg, startTime);
  }
}
