import { z } from 'zod';
import type { ToolContext } from '../types.js';
import { createSuccessResponse, createErrorResponse, type ToolResponse } from '../types.js';

export const TOOL_NAME = 'dialog_get_slow_queries';
export const TOOL_DESCRIPTION = 'Find slow database queries detected in application logs, with execution statistics and optimization hints. Useful for identifying performance bottlenecks.';

export const inputSchema = {
  threshold_ms: z.number()
    .describe('Minimum query duration in milliseconds to be considered "slow". Defaults to 100.')
    .optional(),
  service: z.string()
    .describe('Filter to a specific service')
    .optional(),
  time_range: z.string()
    .describe('Time range to search (e.g., "1h", "30m"). Defaults to "1h".')
    .optional(),
};

export interface GetSlowQueriesResult {
  readonly slow_queries: readonly SlowQueryInfo[];
  readonly total_found: number;
  readonly threshold_ms: number;
  readonly time_range: string;
}

interface SlowQueryInfo {
  readonly query: string;
  readonly duration_ms: number;
  readonly timestamp: string;
  readonly service: string;
  readonly path: string | null;
  readonly log_id: string;
}

export async function handler(
  args: { threshold_ms?: number; service?: string; time_range?: string },
  ctx: ToolContext
): Promise<ToolResponse<GetSlowQueriesResult>> {
  const startTime = Date.now();
  const threshold = args.threshold_ms ?? 100;
  const timeRange = args.time_range ?? '1h';

  try {
    // Query all logs that have db_query set
    const logs = await ctx.storage.queryLogs({
      last: timeRange,
      service: args.service,
      limit: 5000,
    });

    const slowQueries: SlowQueryInfo[] = [];

    for (const log of logs) {
      if (log.db_query && log.duration_ms !== null && log.duration_ms >= threshold) {
        slowQueries.push({
          query: log.db_query,
          duration_ms: log.duration_ms,
          timestamp: log.timestamp.toISOString(),
          service: log.service,
          path: log.path,
          log_id: log.id,
        });
      }
    }

    // Sort by duration descending (slowest first)
    slowQueries.sort((a, b) => b.duration_ms - a.duration_ms);

    return createSuccessResponse(TOOL_NAME, {
      slow_queries: slowQueries.slice(0, 50),
      total_found: slowQueries.length,
      threshold_ms: threshold,
      time_range: timeRange,
    }, startTime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error finding slow queries';
    return createErrorResponse(TOOL_NAME, msg, startTime);
  }
}
