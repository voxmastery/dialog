import { z } from 'zod';
import type { ToolContext } from '../types.js';
import { createSuccessResponse, createErrorResponse, type ToolResponse } from '../types.js';

export const TOOL_NAME = 'dialog_compare_deploys';
export const TOOL_DESCRIPTION = 'Compare application behavior before and after a deployment by analyzing error deltas, new error types, and latency changes between two time periods.';

export const inputSchema = {
  before_start: z.string()
    .describe('Start of the "before" period as ISO 8601 timestamp or relative duration (e.g., "2h" meaning 2 hours ago)'),
  before_end: z.string()
    .describe('End of "before" period / start of "after" period as ISO 8601 timestamp or relative duration (e.g., "1h")'),
  after_end: z.string()
    .describe('End of the "after" period (e.g., "0m" for now, or an ISO timestamp)')
    .optional(),
  service: z.string()
    .describe('Filter to a specific service')
    .optional(),
};

export interface CompareDeploysResult {
  readonly before_period: PeriodSummary;
  readonly after_period: PeriodSummary;
  readonly error_delta: ErrorDelta;
  readonly new_errors: readonly string[];
  readonly resolved_errors: readonly string[];
  readonly latency_change: LatencyChange;
  readonly verdict: 'IMPROVED' | 'DEGRADED' | 'STABLE' | 'INSUFFICIENT_DATA';
}

interface PeriodSummary {
  readonly time_range: string;
  readonly total_logs: number;
  readonly error_count: number;
  readonly error_rate: number;
  readonly avg_latency_ms: number | null;
}

interface ErrorDelta {
  readonly before_count: number;
  readonly after_count: number;
  readonly change_percent: number;
}

interface LatencyChange {
  readonly before_avg_ms: number | null;
  readonly after_avg_ms: number | null;
  readonly change_percent: number | null;
}

function avgDuration(logs: readonly { duration_ms: number | null }[]): number | null {
  const durations = logs
    .map(l => l.duration_ms)
    .filter((d): d is number => d !== null && d > 0);
  if (durations.length === 0) return null;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

export async function handler(
  args: { before_start: string; before_end: string; after_end?: string; service?: string },
  ctx: ToolContext
): Promise<ToolResponse<CompareDeploysResult>> {
  const startTime = Date.now();

  try {
    // Query both periods
    const beforeLogs = await ctx.storage.queryLogs({
      last: args.before_start,
      service: args.service,
      limit: 10000,
    });

    const afterLogs = await ctx.storage.queryLogs({
      last: args.before_end,
      service: args.service,
      limit: 10000,
    });

    const beforeErrors = await ctx.storage.queryErrors({
      last: args.before_start,
      service: args.service,
      level: 'ERROR',
    });

    const afterErrors = await ctx.storage.queryErrors({
      last: args.before_end,
      service: args.service,
      level: 'ERROR',
    });

    const beforeErrorCount = beforeErrors.reduce((s, e) => s + e.count, 0);
    const afterErrorCount = afterErrors.reduce((s, e) => s + e.count, 0);

    const beforeAvg = avgDuration(beforeLogs);
    const afterAvg = avgDuration(afterLogs);

    const beforeErrorMessages = new Set(beforeErrors.map(e => e.error_message));
    const afterErrorMessages = new Set(afterErrors.map(e => e.error_message));

    const newErrors = [...afterErrorMessages].filter(m => !beforeErrorMessages.has(m));
    const resolvedErrors = [...beforeErrorMessages].filter(m => !afterErrorMessages.has(m));

    const errorChangePct = beforeErrorCount > 0
      ? Math.round(((afterErrorCount - beforeErrorCount) / beforeErrorCount) * 100)
      : afterErrorCount > 0 ? 100 : 0;

    const latencyChangePct = beforeAvg && afterAvg
      ? Math.round(((afterAvg - beforeAvg) / beforeAvg) * 100)
      : null;

    let verdict: 'IMPROVED' | 'DEGRADED' | 'STABLE' | 'INSUFFICIENT_DATA';
    if (beforeLogs.length < 5 || afterLogs.length < 5) {
      verdict = 'INSUFFICIENT_DATA';
    } else if (newErrors.length > 0 || errorChangePct > 20 || (latencyChangePct !== null && latencyChangePct > 30)) {
      verdict = 'DEGRADED';
    } else if (resolvedErrors.length > 0 || errorChangePct < -20 || (latencyChangePct !== null && latencyChangePct < -10)) {
      verdict = 'IMPROVED';
    } else {
      verdict = 'STABLE';
    }

    return createSuccessResponse(TOOL_NAME, {
      before_period: {
        time_range: `last ${args.before_start}`,
        total_logs: beforeLogs.length,
        error_count: beforeErrorCount,
        error_rate: beforeLogs.length > 0 ? Math.round((beforeErrorCount / beforeLogs.length) * 10000) / 100 : 0,
        avg_latency_ms: beforeAvg,
      },
      after_period: {
        time_range: `last ${args.before_end}`,
        total_logs: afterLogs.length,
        error_count: afterErrorCount,
        error_rate: afterLogs.length > 0 ? Math.round((afterErrorCount / afterLogs.length) * 10000) / 100 : 0,
        avg_latency_ms: afterAvg,
      },
      error_delta: {
        before_count: beforeErrorCount,
        after_count: afterErrorCount,
        change_percent: errorChangePct,
      },
      new_errors: newErrors,
      resolved_errors: resolvedErrors,
      latency_change: {
        before_avg_ms: beforeAvg,
        after_avg_ms: afterAvg,
        change_percent: latencyChangePct,
      },
      verdict,
    }, startTime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error comparing deploys';
    return createErrorResponse(TOOL_NAME, msg, startTime);
  }
}
