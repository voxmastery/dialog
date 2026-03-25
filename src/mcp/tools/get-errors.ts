import { z } from 'zod';
import type { ToolContext } from '../types.js';
import { createSuccessResponse, createErrorResponse, type ToolResponse } from '../types.js';
import type { ErrorGroup, LogLevel } from '../../types.js';

export const TOOL_NAME = 'dialog_get_errors';
export const TOOL_DESCRIPTION = 'Get recent application errors grouped by type with counts, timestamps, and affected endpoints. Use to understand what is breaking in the application.';

export const inputSchema = {
  time_range: z.string()
    .describe('Time range to search (e.g., "1h", "30m", "1d"). Defaults to "1h".')
    .optional(),
  service: z.string()
    .describe('Filter by service name (e.g., "localhost:3000"). Omit for all services.')
    .optional(),
  severity: z.enum(['ERROR', 'FATAL', 'WARN'])
    .describe('Minimum severity level. Defaults to "ERROR".')
    .optional(),
};

export interface GetErrorsResult {
  readonly errors: readonly ErrorGroupOutput[];
  readonly total_groups: number;
  readonly time_range: string;
}

interface ErrorGroupOutput {
  readonly error_message: string;
  readonly count: number;
  readonly first_seen: string;
  readonly last_seen: string;
  readonly affected_endpoints: readonly string[];
  readonly services: readonly string[];
}

export async function handler(
  args: { time_range?: string; service?: string; severity?: string },
  ctx: ToolContext
): Promise<ToolResponse<GetErrorsResult>> {
  const startTime = Date.now();
  const timeRange = args.time_range ?? '1h';

  try {
    const errors = await ctx.storage.queryErrors({
      last: timeRange,
      service: args.service,
      level: (args.severity as LogLevel | undefined) ?? 'ERROR',
    });

    const errorGroups: readonly ErrorGroupOutput[] = errors.map(e => ({
      error_message: e.error_message,
      count: e.count,
      first_seen: e.first_seen,
      last_seen: e.last_seen,
      affected_endpoints: e.affected_paths,
      services: e.services,
    }));

    return createSuccessResponse(TOOL_NAME, {
      errors: errorGroups,
      total_groups: errorGroups.length,
      time_range: timeRange,
    }, startTime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error querying errors';
    return createErrorResponse(TOOL_NAME, msg, startTime);
  }
}
