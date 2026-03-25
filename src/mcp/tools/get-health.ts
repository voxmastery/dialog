import { z } from 'zod';
import type { ToolContext } from '../types.js';
import { createSuccessResponse, createErrorResponse, type ToolResponse } from '../types.js';
import type { ParsedLogEntry } from '../../types.js';

export const TOOL_NAME = 'dialog_get_health';
export const TOOL_DESCRIPTION = 'Get a health snapshot of monitored services including error rates, latency percentiles (p50/p95/p99), and top failures. Use to quickly assess whether the application is healthy.';

export const inputSchema = {
  service: z.string()
    .describe('Filter to a specific service (e.g., "localhost:3000"). Omit for all services.')
    .optional(),
};

export interface GetHealthResult {
  readonly services: readonly ServiceHealthReport[];
  readonly overall_status: 'OK' | 'WARN' | 'ERROR';
  readonly monitored_since: string | null;
}

interface ServiceHealthReport {
  readonly service: string;
  readonly status: 'OK' | 'WARN' | 'ERROR';
  readonly error_rate_5m: number;
  readonly total_requests_5m: number;
  readonly error_count_5m: number;
  readonly latency: LatencyStats;
  readonly top_failures: readonly TopFailure[];
}

interface LatencyStats {
  readonly p50_ms: number | null;
  readonly p95_ms: number | null;
  readonly p99_ms: number | null;
  readonly avg_ms: number | null;
}

interface TopFailure {
  readonly error_message: string;
  readonly count: number;
  readonly last_seen: string;
}

function computePercentile(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)] ?? null;
}

function computeLatency(logs: readonly ParsedLogEntry[]): LatencyStats {
  const durations = logs
    .map(l => l.duration_ms)
    .filter((d): d is number => d !== null && d > 0)
    .sort((a, b) => a - b);

  if (durations.length === 0) {
    return { p50_ms: null, p95_ms: null, p99_ms: null, avg_ms: null };
  }

  const sum = durations.reduce((acc, d) => acc + d, 0);
  return {
    p50_ms: Math.round(computePercentile(durations, 50) ?? 0),
    p95_ms: Math.round(computePercentile(durations, 95) ?? 0),
    p99_ms: Math.round(computePercentile(durations, 99) ?? 0),
    avg_ms: Math.round(sum / durations.length),
  };
}

export async function handler(
  args: { service?: string },
  ctx: ToolContext
): Promise<ToolResponse<GetHealthResult>> {
  const startTime = Date.now();

  try {
    const recentLogs = await ctx.storage.queryLogs({
      last: '5m',
      service: args.service,
      limit: 10000,
    });

    const errors = await ctx.storage.queryErrors({
      last: '5m',
      service: args.service,
      level: 'ERROR',
    });

    // Group logs by service
    const serviceMap = new Map<string, ParsedLogEntry[]>();
    for (const log of recentLogs) {
      const svc = log.service;
      const existing = serviceMap.get(svc) ?? [];
      serviceMap.set(svc, [...existing, log]);
    }

    // Group errors by service
    const errorMap = new Map<string, typeof errors>();
    for (const err of errors) {
      for (const svc of err.services) {
        const existing = errorMap.get(svc) ?? [];
        errorMap.set(svc, [...existing, err]);
      }
    }

    const allServices = new Set([...serviceMap.keys(), ...errorMap.keys()]);

    const serviceReports: ServiceHealthReport[] = [];

    for (const svc of allServices) {
      const logs = serviceMap.get(svc) ?? [];
      const svcErrors = errorMap.get(svc) ?? [];
      const errorCount = svcErrors.reduce((sum, e) => sum + e.count, 0);
      const total = logs.length;
      const errorRate = total > 0 ? errorCount / total : 0;

      let status: 'OK' | 'WARN' | 'ERROR';
      if (errorRate >= 0.05) status = 'ERROR';
      else if (errorRate > 0 || errorCount > 0) status = 'WARN';
      else status = 'OK';

      const topFailures: TopFailure[] = svcErrors
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(e => ({
          error_message: e.error_message,
          count: e.count,
          last_seen: e.last_seen,
        }));

      serviceReports.push({
        service: svc,
        status,
        error_rate_5m: Math.round(errorRate * 10000) / 100, // percentage with 2 decimals
        total_requests_5m: total,
        error_count_5m: errorCount,
        latency: computeLatency(logs),
        top_failures: topFailures,
      });
    }

    const overallStatus: 'OK' | 'WARN' | 'ERROR' =
      serviceReports.some(s => s.status === 'ERROR') ? 'ERROR' :
      serviceReports.some(s => s.status === 'WARN') ? 'WARN' : 'OK';

    const earliest = recentLogs.length > 0
      ? recentLogs.reduce((min, l) => l.timestamp < min ? l.timestamp : min, recentLogs[0]!.timestamp).toISOString()
      : null;

    return createSuccessResponse(TOOL_NAME, {
      services: serviceReports,
      overall_status: overallStatus,
      monitored_since: earliest,
    }, startTime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error checking health';
    return createErrorResponse(TOOL_NAME, msg, startTime);
  }
}
