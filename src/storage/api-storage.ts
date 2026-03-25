import type { ParsedLogEntry, ErrorGroup, QueryFilters } from '../types.js';
import type { LogStorage } from './duckdb.js';

/**
 * Storage adapter that proxies through the dialog-web HTTP API.
 * Used when dialog-web is running and holds the DuckDB lock.
 */
export function createApiStorage(baseUrl: string = 'http://localhost:9999'): LogStorage {
  async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json() as Promise<T>;
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json() as Promise<T>;
  }

  return {
    async init() {},
    async insertLog() {},
    async insertBatch() {},

    async queryErrors(filters: QueryFilters): Promise<ErrorGroup[]> {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
      ).toString();
      const data = await get<{ errors: ErrorGroup[] }>(`/api/errors${qs ? `?${qs}` : ''}`);
      return data.errors;
    },

    async queryLogs(filters: QueryFilters): Promise<ParsedLogEntry[]> {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
      ).toString();
      const data = await get<{ logs: ParsedLogEntry[] }>(`/api/logs${qs ? `?${qs}` : ''}`);
      return data.logs;
    },

    async queryTimeSeries(service: string, intervalMinutes: number) {
      const data = await get<{ timeseries: Record<string, { timestamp: string; count: number }[]> }>(
        `/api/metrics/timeseries?service=${service}&interval=${intervalMinutes}`
      );
      return data.timeseries[service] ?? [];
    },

    async getLogById(id: string): Promise<ParsedLogEntry | null> {
      const data = await get<{ logs: ParsedLogEntry[] }>(`/api/logs?grep=${id}&limit=1`);
      return data.logs[0] ?? null;
    },

    async cleanupOldLogs() { return 0; },

    async runSQL(sql: string) {
      // Can't run arbitrary SQL through API — return empty
      return [];
    },

    async close() {},
  };
}
