import type { ToolContext } from '../types.js';
import { createSuccessResponse, createErrorResponse, type ToolResponse } from '../types.js';

export const TOOL_NAME = 'dialog_list_services';
export const TOOL_DESCRIPTION = 'List all services that Dialog is monitoring or has log data for, with their current status and recent activity.';

// No input parameters
export const inputSchema = {};

export interface ListServicesResult {
  readonly services: readonly ServiceInfo[];
  readonly total: number;
}

interface ServiceInfo {
  readonly service: string;
  readonly status: 'OK' | 'WARN' | 'ERROR' | 'UNKNOWN';
  readonly log_count_1h: number;
  readonly error_count_1h: number;
  readonly last_seen: string | null;
}

export async function handler(
  _args: Record<string, never>,
  ctx: ToolContext
): Promise<ToolResponse<ListServicesResult>> {
  const startTime = Date.now();

  try {
    const recentLogs = await ctx.storage.queryLogs({
      last: '1h',
      limit: 10000,
    });

    const errors = await ctx.storage.queryErrors({
      last: '1h',
      level: 'ERROR',
    });

    // Build per-service stats
    const serviceStats = new Map<string, {
      logCount: number;
      errorCount: number;
      lastSeen: Date;
    }>();

    for (const log of recentLogs) {
      const existing = serviceStats.get(log.service);
      if (existing) {
        serviceStats.set(log.service, {
          logCount: existing.logCount + 1,
          errorCount: existing.errorCount,
          lastSeen: log.timestamp > existing.lastSeen ? log.timestamp : existing.lastSeen,
        });
      } else {
        serviceStats.set(log.service, {
          logCount: 1,
          errorCount: 0,
          lastSeen: log.timestamp,
        });
      }
    }

    // Add error counts
    for (const err of errors) {
      for (const svc of err.services) {
        const existing = serviceStats.get(svc);
        if (existing) {
          serviceStats.set(svc, {
            ...existing,
            errorCount: existing.errorCount + err.count,
          });
        } else {
          serviceStats.set(svc, {
            logCount: 0,
            errorCount: err.count,
            lastSeen: new Date(err.last_seen),
          });
        }
      }
    }

    const services: ServiceInfo[] = [];
    for (const [svc, stats] of serviceStats) {
      let status: 'OK' | 'WARN' | 'ERROR' | 'UNKNOWN';
      const errorRate = stats.logCount > 0 ? stats.errorCount / stats.logCount : 0;
      if (stats.logCount === 0) status = 'UNKNOWN';
      else if (errorRate >= 0.05) status = 'ERROR';
      else if (stats.errorCount > 0) status = 'WARN';
      else status = 'OK';

      services.push({
        service: svc,
        status,
        log_count_1h: stats.logCount,
        error_count_1h: stats.errorCount,
        last_seen: stats.lastSeen.toISOString(),
      });
    }

    // Sort by error count descending, then service name
    services.sort((a, b) => b.error_count_1h - a.error_count_1h || a.service.localeCompare(b.service));

    return createSuccessResponse(TOOL_NAME, {
      services,
      total: services.length,
    }, startTime);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error listing services';
    return createErrorResponse(TOOL_NAME, msg, startTime);
  }
}
