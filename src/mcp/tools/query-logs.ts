import { z } from 'zod';
import type { ToolContext } from '../types.js';
import { createSuccessResponse, createErrorResponse, type ToolResponse } from '../types.js';

export const TOOL_NAME = 'dialog_query_logs';
export const TOOL_DESCRIPTION = 'Query application logs using natural language. The question is processed by an AI router that generates SQL queries and performs semantic search to find relevant log entries, then provides an AI-powered summary.';

export const inputSchema = {
  question: z.string()
    .describe('Natural language question about the application logs (e.g., "Why did checkout fail?", "Show errors in the last 30 minutes")'),
};

export interface QueryLogsResult {
  readonly answer: string;
  readonly question: string;
  readonly ai_available: boolean;
}

export async function handler(
  args: { question: string },
  ctx: ToolContext
): Promise<ToolResponse<QueryLogsResult>> {
  const startTime = Date.now();

  try {
    const response = await ctx.aiRouter.handleQuestion(args.question);

    if (!response.success) {
      return createErrorResponse(TOOL_NAME, response.error ?? 'AI query failed', startTime);
    }

    return createSuccessResponse(TOOL_NAME, {
      answer: response.answer ?? 'No answer available.',
      question: args.question,
      ai_available: ctx.mistralClient.isAvailable(),
    }, startTime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error processing query';
    return createErrorResponse(TOOL_NAME, msg, startTime);
  }
}
